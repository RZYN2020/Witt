#[tokio::main]
async fn main() {
    if let Err(error) = witt_server::server::run_from_env().await {
        eprintln!("{error}");
        std::process::exit(1);
    }
}
