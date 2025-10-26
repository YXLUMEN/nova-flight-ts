use bytes::{BufMut, BytesMut};
use futures_util::{SinkExt, StreamExt};
use std::{collections::HashMap, sync::Arc, sync::LazyLock};
use tokio::net::TcpListener;
use tokio::sync::{mpsc, oneshot, Mutex, RwLock};
use tokio_tungstenite::accept_async;
use tokio_tungstenite::tungstenite::{Bytes, Message};

type Tx = mpsc::UnboundedSender<Bytes>;

#[derive(Default)]
struct State {
    server: Option<Tx>,
    clients: HashMap<[u8; 16], Tx>,
}

static SERVER: LazyLock<Mutex<Option<Arc<RwLock<State>>>>> = LazyLock::new(|| Mutex::new(None));
static STOP_TX: LazyLock<Mutex<Option<oneshot::Sender<()>>>> = LazyLock::new(|| Mutex::new(None));

#[tauri::command]
pub async fn start_server(port: u16) -> Result<(), String> {
    let mut server_guard = SERVER.lock().await;
    if server_guard.is_some() {
        return Err(format!("Server already listen on \"{}\"", port));
    }

    let state = Arc::new(RwLock::new(State::default()));
    let cloned = state.clone();

    let (tx, rx) = oneshot::channel();
    *STOP_TX.lock().await = Some(tx);

    tokio::spawn(run_ws_server(port, cloned, rx));

    *server_guard = Some(state);
    Ok(())
}

#[tauri::command]
pub async fn stop_server() -> Result<(), String> {
    if let Some(tx) = STOP_TX.lock().await.take() {
        let _ = tx.send(());
    }
    Ok(())
}

async fn run_ws_server(port: u16, state: Arc<RwLock<State>>, mut stop_rx: oneshot::Receiver<()>) {
    let addr = format!("0.0.0.0:{}", port);

    let listener = TcpListener::bind(&addr)
        .await
        .expect("Failed to bind address");

    println!("[INFO] WebSocket server listening on {}", addr);

    loop {
        tokio::select! {
                _ = &mut stop_rx => {
                    println!("[INFO] Shutting down server");
                    break;
                }
                accept_res = listener.accept() => {
                    let (stream, _) = match accept_res {
                        Ok(s) => s,
                        Err(e) => {
                            eprintln!("[ERROR] Accept error: {}", e);
                            continue;
                        }
                    };

            let state = state.clone();

            tokio::spawn(async move {
                let ws_stream = match accept_async(stream).await {
                    Ok(ws) => ws,
                    Err(e) => {
                        eprintln!("[ERROR] WebSocket handshake failed: {}", e);
                        return;
                    }
                };

                let (mut write, mut read) = ws_stream.split();
                let (tx, mut rx) = mpsc::unbounded_channel::<Bytes>();

                // 发送任务
                let send_task = tokio::spawn(async move {
                    while let Some(msg) = rx.recv().await {
                        if let Err(e) = write.send(Message::Binary(msg)).await {
                            eprintln!("Send error: {}", e);
                            break;
                        }
                    }
                });

                // 接收任务
                while let Some(msg) = read.next().await {
                    match msg {
                        Ok(Message::Binary(data)) => {
                            handle_message(&state, &tx, data).await;
                        }
                        Ok(_) => {}
                        Err(e) => {
                            eprintln!("[ERROR] Read error: {}", e);
                            break;
                        }
                    }
                }

                {
                    let mut st = state.write().await;
                    // 如果是 server
                    if st
                        .server
                        .as_ref()
                        .map(|s| s.same_channel(&tx))
                        .unwrap_or(false)
                    {
                        st.server = None;
                        println!("[INFO] Server disconnected");
                    }
                    // 如果是 client
                    st.clients.retain(|id, c| {
                        let keep = !c.same_channel(&tx);
                        if !keep {
                            println!("[INFO] Client {} disconnected", format_uuid(&id));
                        }
                        keep
                    });
                }

                drop(tx);
                send_task.await.ok();
            });
        }}
    }

    let mut global = SERVER.lock().await;
    *global = None;
    let mut stop = STOP_TX.lock().await;
    *stop = None;
}

/// 协议说明:
/// 0x00 = 中继服务器消息
/// 0x01 = 注册为 Server
/// 0x02 = 注册为 Client + 后续字节是 client_id
/// 0x10 = Client -> Server
/// 0x11 = Server -> Client 广播 + 单个排除
/// 0x12 = Server -> Client 单发
async fn handle_message(state: &Arc<RwLock<State>>, tx: &Tx, data: Bytes) {
    if data.is_empty() {
        eprintln!("[WARN] Empty message received");
        return;
    }

    match data[0] {
        0x01 => {
            // 注册 Server
            let mut st = state.write().await;
            st.server = Some(tx.clone());
            println!("[INFO] Server registered");
        }
        0x02 => {
            // 注册 Client
            if data.len() < 17 {
                eprintln!("[WARN] Invalid client register packet");
                return;
            }

            let mut id = [0u8; 16];
            id.copy_from_slice(&data[1..17]);

            let mut st = state.write().await;
            // 重复检查
            if st.clients.contains_key(&id) {
                println!(
                    "[WARN] Duplicate client UUID {}, registration rejected",
                    format_uuid(&id)
                );

                relay_send(&tx, "ERR: Duplicate Player UUID");

                return;
            }

            st.clients.insert(id, tx.clone());

            println!("[INFO] Client {} registered", format_uuid(&id));
        }
        0x10 => {
            // Client → Server
            let st = state.read().await;
            if let Some(server) = &st.server {
                let _ = server.send(data);
            }
        }
        0x11 => {
            // Server → 广播给所有 Client
            let mut st = state.write().await;
            st.clients
                .retain(|id, client| send_or_drop(id, client, &data));
        }
        0x12 => {
            // Server → 指定 Client
            if data.len() < 17 {
                eprintln!("[WARN] Invalid unicast packet");
                return;
            }

            // UUID截断
            let mut target = [0u8; 16];
            target.copy_from_slice(&data[1..17]);
            let rest = data.slice(17..);

            let mut buf = BytesMut::with_capacity(1 + rest.len());

            // 服务器标头
            buf.put_u8(0x11);
            buf.extend_from_slice(&rest);
            let forwarded = buf.freeze();

            let mut st = state.write().await;
            if let Some(client) = st.clients.get(&target) {
                if client.send(forwarded).is_err() {
                    println!("[WARN] Client {} dropped", format_uuid(&target));
                    st.clients.remove(&target);
                }
            }
        }
        0x13 => {
            // Server → 广播给未被排除的 Client
            if data.len() < 17 {
                eprintln!("[WARN] Invalid server packet");
                return;
            }

            let mut cursor = &data[1..];

            let (count, rest) = match read_var_uint(cursor) {
                Ok(v) => v,
                Err(e) => {
                    eprintln!("[WARN] VarUInt parse error: {}", e);
                    return;
                }
            };
            cursor = rest;

            // 解析UUID
            let (excludes, rest_payload) = match parse_excludes(cursor, count) {
                Ok(v) => v,
                Err(e) => {
                    eprintln!("[WARN] {}", e);
                    return;
                }
            };

            let mut buf = BytesMut::with_capacity(1 + rest_payload.len());

            // 服务器标头
            buf.put_u8(0x11);
            buf.extend_from_slice(rest_payload);
            let forwarded = buf.freeze();

            let mut st = state.write().await;
            st.clients.retain(|id, client| {
                if excludes.iter().any(|ex| ex == id) {
                    return true;
                }
                send_or_drop(id, client, &forwarded)
            });
        }
        _ => {
            eprintln!("[WARN] Unknown opcode: {}", data[0]);
        }
    }
}

fn parse_excludes(mut cursor: &[u8], count: u32) -> Result<(Vec<[u8; 16]>, &[u8]), &'static str> {
    // 总长检查
    let needed = count as usize * 16;
    if cursor.len() < needed {
        return Err("Not enough bytes for excludes");
    }

    let mut excludes = Vec::with_capacity(count as usize);

    for _ in 0..count {
        let mut id = [0u8; 16];
        id.copy_from_slice(&cursor[..16]);
        cursor = &cursor[16..];

        if !is_nil_uuid(&id) {
            excludes.push(id);
        }
    }
    Ok((excludes, cursor))
}

/// 中继服务器发送
fn relay_send(tx: &Tx, msg: &str) {
    let mut buf = BytesMut::new();
    buf.put_u8(0x00);

    let bytes = msg.as_bytes();
    buf.put_u16_le(bytes.len() as u16);
    buf.put_slice(bytes);

    let _ = tx.send(buf.freeze());
}

/// 向指定 id 发送数据包
fn send_or_drop(id: &[u8; 16], client: &Tx, msg: &Bytes) -> bool {
    if client.send(msg.clone()).is_err() {
        println!("[WARN] Client {} dropped", format_uuid(id));
        false
    } else {
        true
    }
}

fn is_nil_uuid(uuid: &[u8]) -> bool {
    uuid.iter().all(|&b| b == 0)
}

fn format_uuid(bytes: &[u8; 16]) -> String {
    assert_eq!(bytes.len(), 16);
    let hex: Vec<String> = bytes.iter().map(|b| format!("{:02x}", b)).collect();
    let s = hex.join("");
    format!(
        "{}-{}-{}-{}-{}",
        &s[0..8],
        &s[8..12],
        &s[12..16],
        &s[16..20],
        &s[20..32]
    )
}

fn read_var_uint(mut buf: &[u8]) -> Result<(u32, &[u8]), &'static str> {
    let mut result: u32 = 0;
    let mut shift = 0;

    loop {
        if buf.is_empty() {
            return Err("Unexpected end of buffer while reading VarUInt");
        }
        let byte = buf[0];
        buf = &buf[1..];

        result |= ((byte & 0x7F) as u32) << shift;

        if (byte & 0x80) == 0 {
            break;
        }
        shift += 7;
        if shift > 35 {
            return Err("VarUInt is too big");
        }
    }

    Ok((result, buf))
}
