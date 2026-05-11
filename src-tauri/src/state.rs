use parking_lot::Mutex;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::watch;

#[derive(Clone)]
pub struct JobHandle {
    pub cancel: watch::Sender<bool>,
}

#[derive(Default)]
pub struct AppState {
    pub jobs: Arc<Mutex<HashMap<String, JobHandle>>>,
}
