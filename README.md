# Keyboard Pause

Keyboard Pause is a simple Windows keyboard blocker for cleaning your laptop, keyboard, touchpad, or desk setup. Open the app, pause input, clean safely, then unlock when you are done.

It can block keyboard input, touchpad/mouse input, or both at the same time.

## Download And Install

1. Go to the latest GitHub release.
2. Download the release `.zip`.
3. Extract the `.zip`.
4. Open `Keyboard Pause Setup 0.1.0.exe`.
5. Follow the installer.
6. Start Keyboard Pause from the Desktop shortcut or the Start Menu.

The installer creates shortcuts named `Keyboard Pause`.

## How To Use

1. Open Keyboard Pause.
2. Choose `Block keyboard`, `Block touchpad`, or `Block both`.
3. Clean your device.
4. Unlock input when finished.

You can unlock in three ways:

- Click `Unlock all`.
- Wait for the auto-unlock timer.
- Press `Ctrl + Alt + U`.

Remember `Ctrl + Alt + U` before starting a cleaning session.

## What It Blocks

- `Block keyboard` blocks physical keyboard input.
- `Block touchpad` blocks Windows pointer input, including touchpads and external mice.
- `Block both` blocks keyboard and pointer input together.

## Windows Notes

Keyboard Pause uses a small Windows helper to block input with low-level Windows hooks.

Some administrator windows may ignore input blocking from a non-admin app. If you need Keyboard Pause to work over elevated admin windows, run it as administrator.

## For Developers

Install dependencies:

```powershell
npm install
```

Run locally:

```powershell
npm start
```

Build the Windows installer and portable app:

```powershell
npm run dist
```

Build output is written to `dist/`.

The files normal users need are:

- `Keyboard Pause Setup 0.1.0.exe`
- `Keyboard Pause 0.1.0.exe`

Do not ask normal users to download the source code zip unless they know how to use Node.js and npm.

## Project Structure

```text
native/InputLock.ps1        Windows input hook helper
scripts/start.ps1           Local development launcher
scripts/prepare-icon.ps1    Builds the Windows icon from the PNG logo
src/main.js                 Electron main process
src/preload.js              IPC bridge
src/renderer/               App UI
src/assets/keyboard.png     App logo
```

## License

MIT
# keyboard-pause
