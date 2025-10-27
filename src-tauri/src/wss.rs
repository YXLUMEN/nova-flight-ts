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

struct ServerHandle {
    port: u16,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum Role {
    Unknown,
    Server,
    Client,
}

static SERVER: LazyLock<Mutex<Option<ServerHandle>>> = LazyLock::new(|| Mutex::new(None));
static STOP_TX: LazyLock<Mutex<Option<oneshot::Sender<()>>>> = LazyLock::new(|| Mutex::new(None));

#[tauri::command]
pub async fn start_server(port: u16) -> Result<(), String> {
    // 单次启动
    let mut server_guard = SERVER.lock().await;
    if let Some(handle) = server_guard.as_ref() {
        return Err(format!("Server already listen on \"{}\"", handle.port));
    }

    let state = Arc::new(RwLock::new(State::default()));
    let (tx, rx) = oneshot::channel();
    *STOP_TX.lock().await = Some(tx);

    // 开始监听
    let addr = format!("0.0.0.0:{}", port);
    let listener = TcpListener::bind(&addr)
        .await
        .map_err(|e| format!("Failed to bind {}: {}", addr, e))?;

    println!("[INFO] WebSocket server listening on {}", addr);

    // 启动任务
    tokio::spawn(run_ws_server(listener, state.clone(), rx));

    *server_guard = Some(ServerHandle { port });
    Ok(())
}

#[tauri::command]
pub async fn stop_server() -> Result<(), String> {
    if let Some(tx) = STOP_TX.lock().await.take() {
        let _ = tx.send(());
    }
    Ok(())
}

async fn run_ws_server(
    listener: TcpListener,
    state: Arc<RwLock<State>>,
    mut stop_receiver: oneshot::Receiver<()>,
) {
    loop {
        tokio::select! {
                _ = &mut stop_receiver => {
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

                let (mut writer, mut reader) = ws_stream.split();
                let (tx, mut rx) = mpsc::unbounded_channel::<Bytes>();

                // 发送任务
                let send_task = tokio::spawn(async move {
                    while let Some(msg) = rx.recv().await {
                        if let Err(e) = writer.send(Message::Binary(msg)).await {
                            eprintln!("Send error: {}", e);
                            break;
                        }
                    }
                });

                // 接收任务
                while let Some(msg) = reader.next().await {
                    match msg {
                        Ok(Message::Binary(payload)) => {
                            handle_incoming_message(&state, &tx, payload).await;
                        }
                        Ok(_) => {}
                        Err(e) => {
                            eprintln!("[ERROR] Read error: {}", e);
                            break;
                        }
                    }
                }

                {
                    let mut state_lock = state.write().await;

                    if state_lock
                        .server
                        .as_ref()
                        .map(|s| s.same_channel(&tx))
                        .unwrap_or(false)
                    {
                        state_lock.server = None;
                        println!("[INFO] Server disconnected");
                    }

                    state_lock.clients.retain(|id, c| {
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

    {
        let mut state_lock = state.write().await;
        state_lock.server = None;
        state_lock.clients.clear();

        let mut server = SERVER.lock().await;
        *server = None;
        let mut stop = STOP_TX.lock().await;
        *stop = None;
    }
}

/// 协议说明:
/// 0x00 = 中继服务器消息
/// 0x01 = 注册为 Server
/// 0x02 = 注册为 Client + 后续字节是 client_id
/// 0x10 = Client -> Server
/// 0x11 = Server -> Client 广播 + 单个排除
/// 0x12 = Server -> Client 单发
async fn handle_incoming_message(state: &Arc<RwLock<State>>, tx: &Tx, payload: Bytes) {
    if payload.is_empty() {
        println!("[WARN] Empty message received");
        return;
    }

    let role = {
        let state_lock = state.read().await;
        if state_lock
            .server
            .as_ref()
            .map(|s| s.same_channel(tx))
            .unwrap_or(false)
        {
            Role::Server
        } else if state_lock.clients.values().any(|c| c.same_channel(tx)) {
            Role::Client
        } else {
            Role::Unknown
        }
    };

    match payload[0] {
        0x01 => {
            // 注册 Server
            let mut state_lock = state.write().await;
            if state_lock.server.is_some() {
                return;
            }

            state_lock.server = Some(tx.clone());
            println!("[INFO] Server registered");
        }
        0x02 => {
            // 注册 Client
            if payload.len() < 17 {
                eprintln!("[WARN] Invalid client register packet");
                return;
            }

            let mut client_id = [0u8; 16];
            client_id.copy_from_slice(&payload[1..17]);

            let mut state_lock = state.write().await;

            // 服务器连接不允许注册为 client
            if state_lock
                .server
                .as_ref()
                .map(|s| s.same_channel(tx))
                .unwrap_or(false)
            {
                println!("[WARN] Server connection tried to register as client, rejected");
                send_relay_message(tx, "ERR: Server cannot register as Client");
                return;
            }

            // 重复检查
            if state_lock.clients.contains_key(&client_id) {
                println!(
                    "[WARN] Duplicate client UUID {}, registration rejected",
                    format_uuid(&client_id)
                );

                send_relay_message(&tx, "ERR: Duplicate Player UUID");
                return;
            }

            state_lock.clients.insert(client_id, tx.clone());
            println!("[INFO] Client {} registered", format_uuid(&client_id));
        }
        0x10 => {
            // Client → Server
            if role != Role::Client {
                return;
            }

            let state_lock = state.read().await;
            if let Some(server) = &state_lock.server {
                let _ = server.send(payload);
            }
        }
        0x11 => {
            // Server → 广播给所有 Client
            if role != Role::Server {
                return;
            }

            let mut state_lock = state.write().await;
            state_lock
                .clients
                .retain(|id, client| send_or_drop(id, client, &payload));
        }
        0x12 => {
            // Server → 指定 Client
            if role != Role::Server {
                return;
            }

            if payload.len() < 17 {
                eprintln!("[WARN] Invalid unicast packet");
                return;
            }

            // UUID截断
            let mut target_client_id = [0u8; 16];
            target_client_id.copy_from_slice(&payload[1..17]);

            let remaining = payload.slice(17..);
            let mut buf = BytesMut::with_capacity(1 + remaining.len());

            // 服务器标头
            buf.put_u8(0x11);
            buf.extend_from_slice(&remaining);
            let forwarded = buf.freeze();

            let mut st = state.write().await;
            if let Some(client) = st.clients.get(&target_client_id) {
                if client.send(forwarded).is_err() {
                    println!("[WARN] Client {} dropped", format_uuid(&target_client_id));
                    st.clients.remove(&target_client_id);
                }
            }
        }
        0x13 => {
            // Server → 广播给未被排除的 Client
            if role != Role::Server {
                return;
            }

            if payload.len() < 17 {
                eprintln!("[WARN] Invalid server packet");
                return;
            }

            let mut cursor = &payload[1..];

            let (count, remaining) = match read_var_uint(cursor) {
                Ok(v) => v,
                Err(e) => {
                    eprintln!("[WARN] VarUInt parse error: {}", e);
                    return;
                }
            };
            cursor = remaining;

            // 解析UUID
            let (excludes, rest_payload) = match parse_excludes(cursor, count) {
                Ok(v) => v,
                Err(e) => {
                    eprintln!("[WARN] {}", e);
                    return;
                }
            };

            let mut buf = BytesMut::with_capacity(1 + rest_payload.len());
            buf.put_u8(0x11);
            buf.extend_from_slice(rest_payload);
            let forwarded = buf.freeze();

            let mut state_lock = state.write().await;
            state_lock.clients.retain(|id, client| {
                if excludes.iter().any(|ex| ex == id) {
                    return true;
                }
                send_or_drop(id, client, &forwarded)
            });
        }
        _ => {
            eprintln!("[WARN] Unknown opcode: {}", payload[0]);
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
fn send_relay_message(tx: &Tx, msg: &str) {
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
