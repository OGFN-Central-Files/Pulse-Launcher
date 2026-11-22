#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::env;
use widestring::U16CString;
use winapi::shared::ntdef::NULL;
use winapi::um::shellapi::ShellExecuteW;
use winapi::um::winnt::LPCWSTR;
use winapi::um::winuser::SW_SHOWNORMAL;

fn main() {
    if !is_elevated() {
        relaunch_as_admin();
        return;
    }

    launcher_lib::run();
}

fn is_elevated() -> bool {
    use winapi::um::processthreadsapi::GetCurrentProcess;
    use winapi::um::processthreadsapi::OpenProcessToken;
    use winapi::um::securitybaseapi::GetTokenInformation;
    use winapi::um::winnt::{TokenElevation, HANDLE, TOKEN_ELEVATION, TOKEN_QUERY};

    unsafe {
        let mut token: HANDLE = std::ptr::null_mut();
        if OpenProcessToken(GetCurrentProcess(), TOKEN_QUERY, &mut token) == 0 {
            return false;
        }

        let mut elevation = TOKEN_ELEVATION { TokenIsElevated: 0 };
        let mut ret_len = 0;
        let res = GetTokenInformation(
            token,
            TokenElevation,
            &mut elevation as *mut _ as *mut _,
            std::mem::size_of::<TOKEN_ELEVATION>() as u32,
            &mut ret_len,
        );
        elevation.TokenIsElevated != 0 && res != 0
    }
}

fn relaunch_as_admin() {
    let exe = env::current_exe().unwrap();
    let exe_wide = U16CString::from_str(exe.to_str().unwrap()).unwrap();
    let verb = U16CString::from_str("runas").unwrap();

    unsafe {
        ShellExecuteW(
            NULL as _,
            verb.as_ptr() as LPCWSTR,
            exe_wide.as_ptr(),
            std::ptr::null(),
            std::ptr::null(),
            SW_SHOWNORMAL,
        );
    }

    std::process::exit(0);
}
