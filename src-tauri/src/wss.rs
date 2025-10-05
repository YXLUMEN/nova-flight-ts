use futures_util::{SinkExt, StreamExt};
use std::{collections::HashMap, sync::Arc};
use tokio::net::TcpListener;
use tokio::sync::mpsc;
use tokio::sync::Mutex;
use tokio_tungstenite::accept_async;
use tokio_tungstenite::tungstenite::{Bytes, Message};

type Tx = mpsc::UnboundedSender<Bytes>;

#[derive(Default)]
struct State {
    server: Option<Tx>,
    clients: HashMap<String, Tx>,
}

pub async fn start_ws_server(addr: &str) {
    let listener = TcpListener::bind(addr)
        .await
        .expect("Failed to bind address");
    let state = Arc::new(Mutex::new(State::default()));

    println!("[INFO] WebSocket server listening on {}", addr);

    loop {
        let (stream, _) = match listener.accept().await {
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
                let mut st = state.lock().await;
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
                        println!("[INFO] Client {} disconnected", id);
                    }
                    keep
                });
            }

            send_task.abort();
        });
    }
}

/// 协议说明：
/// 0x01 = 注册为 Server
/// 0x02 = 注册为 Client + 后续字节是 client_id
/// 0x10 = Client → Server
/// 0x11 = Server → Client (广播)
async fn handle_message(state: &Arc<Mutex<State>>, tx: &Tx, data: Bytes) {
    if data.is_empty() {
        eprintln!("[WARN] Empty message received");
        return;
    }

    match data[0] {
        0x01 => {
            // 注册 Server
            let mut st = state.lock().await;
            st.server = Some(tx.clone());
            println!("[INFO] Server registered");
        }
        0x02 => {
            // 注册 Client
            let id = String::from_utf8_lossy(&data[1..]).to_string();
            let mut st = state.lock().await;
            st.clients.insert(id.clone(), tx.clone());
            println!("[INFO] Client {} registered", id);
        }
        0x10 => {
            // Client → Server
            let st = state.lock().await;
            if let Some(server) = &st.server {
                let _ = server.send(data.clone());
            }
        }
        0x11 => {
            // Server → 广播给所有 Client
            let mut st = state.lock().await;
            st.clients.retain(|id, client| {
                if client.send(data.clone()).is_err() {
                    println!("[WARN] Client {} dropped", id);
                    false
                } else {
                    true
                }
            });
        }
        _ => {
            eprintln!("[WARN] Unknown opcode: {}", data[0]);
        }
    }
}
