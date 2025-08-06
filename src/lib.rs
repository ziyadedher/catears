#![no_std]
#![deny(unsafe_code)]
#![warn(
    clippy::pedantic,
    clippy::unwrap_used,
    clippy::panic,
    clippy::todo,
    clippy::unimplemented,
    clippy::unreachable,
    clippy::module_name_repetitions
)]
#![deny(
    clippy::mem_forget,
    reason = "mem::forget is generally not safe to do with esp_hal types, especially those holding buffers for the \
    duration of a data transfer."
)]

pub mod audio;
pub mod cmdline;
pub mod lights;
pub mod networking;
pub mod servo;
pub mod state;
