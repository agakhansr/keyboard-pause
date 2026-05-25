$ErrorActionPreference = 'Stop'

Add-Type -TypeDefinition @'
using System;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Threading;
using System.Windows.Forms;

public static class InputLockHost
{
    private const int WH_KEYBOARD_LL = 13;
    private const int WH_MOUSE_LL = 14;
    private const int WM_KEYDOWN = 0x0100;
    private const int WM_SYSKEYDOWN = 0x0104;
    private const int WM_KEYUP = 0x0101;
    private const int WM_SYSKEYUP = 0x0105;
    private const int VK_CONTROL = 0x11;
    private const int VK_LCONTROL = 0xA2;
    private const int VK_RCONTROL = 0xA3;
    private const int VK_MENU = 0x12;
    private const int VK_LMENU = 0xA4;
    private const int VK_RMENU = 0xA5;
    private const int VK_U = 0x55;

    private static readonly LowLevelKeyboardProc KeyboardProc = KeyboardHookCallback;
    private static readonly LowLevelMouseProc MouseProc = MouseHookCallback;
    private static readonly object OutputLock = new object();
    private static IntPtr keyboardHook = IntPtr.Zero;
    private static IntPtr mouseHook = IntPtr.Zero;
    private static bool ctrlDown;
    private static bool altDown;

    public static volatile bool KeyboardBlocked;
    public static volatile bool PointerBlocked;

    public static void Run()
    {
        keyboardHook = SetHook(KeyboardProc, WH_KEYBOARD_LL);
        mouseHook = SetHook(MouseProc, WH_MOUSE_LL);
        Write("{\"type\":\"ready\"}");
        WriteStatus();

        Thread inputThread = new Thread(ReadCommands);
        inputThread.IsBackground = true;
        inputThread.Start();

        Application.Run();
    }

    private static void ReadCommands()
    {
        string line;
        while ((line = Console.ReadLine()) != null)
        {
            HandleCommand(line.Trim().ToLowerInvariant());
        }
        HandleCommand("quit");
    }

    private static void HandleCommand(string command)
    {
        switch (command)
        {
            case "keyboard on":
                KeyboardBlocked = true;
                WriteStatus();
                break;
            case "keyboard off":
                KeyboardBlocked = false;
                WriteStatus();
                break;
            case "pointer on":
                PointerBlocked = true;
                WriteStatus();
                break;
            case "pointer off":
                PointerBlocked = false;
                WriteStatus();
                break;
            case "unlock-all":
                UnlockAll(false);
                break;
            case "status":
                WriteStatus();
                break;
            case "quit":
                UnlockAll(false);
                Application.Exit();
                break;
        }
    }

    private static IntPtr SetHook(Delegate proc, int hookType)
    {
        using (Process currentProcess = Process.GetCurrentProcess())
        using (ProcessModule currentModule = currentProcess.MainModule)
        {
            IntPtr moduleHandle = GetModuleHandle(currentModule.ModuleName);
            return SetWindowsHookEx(hookType, proc, moduleHandle, 0);
        }
    }

    private static IntPtr KeyboardHookCallback(int nCode, IntPtr wParam, IntPtr lParam)
    {
        if (nCode >= 0)
        {
            int message = wParam.ToInt32();
            int vkCode = Marshal.ReadInt32(lParam);
            bool keyDown = message == WM_KEYDOWN || message == WM_SYSKEYDOWN;
            bool keyUp = message == WM_KEYUP || message == WM_SYSKEYUP;

            if (keyDown || keyUp)
            {
                UpdateModifierState(vkCode, keyDown);

                if (keyDown && vkCode == VK_U && ctrlDown && altDown)
                {
                    UnlockAll(true);
                    return (IntPtr)1;
                }
            }

            if (KeyboardBlocked)
            {
                return (IntPtr)1;
            }
        }

        return CallNextHookEx(keyboardHook, nCode, wParam, lParam);
    }

    private static void UpdateModifierState(int vkCode, bool keyDown)
    {
        if (vkCode == VK_CONTROL || vkCode == VK_LCONTROL || vkCode == VK_RCONTROL)
        {
            ctrlDown = keyDown;
        }
        else if (vkCode == VK_MENU || vkCode == VK_LMENU || vkCode == VK_RMENU)
        {
            altDown = keyDown;
        }
    }

    private static IntPtr MouseHookCallback(int nCode, IntPtr wParam, IntPtr lParam)
    {
        if (nCode >= 0 && PointerBlocked)
        {
            return (IntPtr)1;
        }

        return CallNextHookEx(mouseHook, nCode, wParam, lParam);
    }

    private static void UnlockAll(bool fromShortcut)
    {
        KeyboardBlocked = false;
        PointerBlocked = false;
        WriteStatus();

        if (fromShortcut)
        {
            Write("{\"type\":\"shortcut-unlocked\"}");
        }
    }

    private static void WriteStatus()
    {
        Write("{\"type\":\"status\",\"keyboardBlocked\":" + Bool(KeyboardBlocked) + ",\"pointerBlocked\":" + Bool(PointerBlocked) + "}");
    }

    private static void Write(string json)
    {
        lock (OutputLock)
        {
            Console.WriteLine(json);
            Console.Out.Flush();
        }
    }

    private static string Bool(bool value)
    {
        return value ? "true" : "false";
    }

    private delegate IntPtr LowLevelKeyboardProc(int nCode, IntPtr wParam, IntPtr lParam);
    private delegate IntPtr LowLevelMouseProc(int nCode, IntPtr wParam, IntPtr lParam);

    [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
    private static extern IntPtr SetWindowsHookEx(int idHook, Delegate lpfn, IntPtr hMod, uint dwThreadId);

    [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
    private static extern IntPtr CallNextHookEx(IntPtr hhk, int nCode, IntPtr wParam, IntPtr lParam);

    [DllImport("kernel32.dll", CharSet = CharSet.Auto, SetLastError = true)]
    private static extern IntPtr GetModuleHandle(string lpModuleName);
}
'@ -ReferencedAssemblies @('System.Windows.Forms')

[InputLockHost]::Run()
