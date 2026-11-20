using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Text;

// Chrome can forward a launch to its running process, which then ignores the
// new fullscreen flag. The fallback sends F11 only to the newly opened app.
public static class JianweiDesktopFullscreen
{
    private const uint KeyDown = 0x0100;
    private const uint KeyUp = 0x0101;
    private const int F11 = 0x7A;
    private const uint DefaultToNearestMonitor = 2;
    private delegate bool WindowCallback(IntPtr window, IntPtr parameter);

    [StructLayout(LayoutKind.Sequential)]
    private struct Rect
    {
        public int Left, Top, Right, Bottom;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct MonitorInfo
    {
        public int Size;
        public Rect Monitor, WorkArea;
        public uint Flags;
    }

    [DllImport("user32.dll")]
    private static extern bool EnumWindows(WindowCallback callback, IntPtr parameter);
    [DllImport("user32.dll")]
    private static extern bool IsWindowVisible(IntPtr window);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    private static extern int GetWindowText(IntPtr window, StringBuilder text, int length);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    private static extern int GetClassName(IntPtr window, StringBuilder text, int length);
    [DllImport("user32.dll")]
    private static extern uint GetWindowThreadProcessId(IntPtr window, out uint processId);
    [DllImport("user32.dll")]
    private static extern bool GetWindowRect(IntPtr window, out Rect bounds);
    [DllImport("user32.dll")]
    private static extern IntPtr MonitorFromWindow(IntPtr window, uint flags);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    private static extern bool GetMonitorInfo(IntPtr monitor, ref MonitorInfo info);
    [DllImport("user32.dll")]
    private static extern bool PostMessage(IntPtr window, uint message, IntPtr key, IntPtr details);

    public static IntPtr[] BrowserWindows()
    {
        var windows = new List<IntPtr>();
        EnumWindows((window, _) =>
        {
            var className = new StringBuilder(64);
            GetClassName(window, className, className.Capacity);
            if (className.ToString() == "Chrome_WidgetWin_1") windows.Add(window);
            return true;
        }, IntPtr.Zero);
        return windows.ToArray();
    }

    public static bool IsAppWindow(IntPtr window, string browserPath, string appTitle)
    {
        if (!IsWindowVisible(window)) return false;
        var title = new StringBuilder(256);
        GetWindowText(window, title, title.Capacity);
        if (!String.Equals(title.ToString(), appTitle, StringComparison.Ordinal)) return false;

        uint processId;
        GetWindowThreadProcessId(window, out processId);
        try
        {
            using (var browser = Process.GetProcessById((int)processId))
            {
                return String.Equals(browser.MainModule.FileName, browserPath, StringComparison.OrdinalIgnoreCase);
            }
        }
        catch (ArgumentException) { return false; }
        catch (InvalidOperationException) { return false; }
        catch (System.ComponentModel.Win32Exception) { return false; }
    }

    public static bool IsFullscreen(IntPtr window)
    {
        Rect bounds;
        var monitorInfo = new MonitorInfo { Size = Marshal.SizeOf(typeof(MonitorInfo)) };
        var monitor = MonitorFromWindow(window, DefaultToNearestMonitor);
        if (monitor == IntPtr.Zero || !GetWindowRect(window, out bounds) || !GetMonitorInfo(monitor, ref monitorInfo))
            return false;

        var screen = monitorInfo.Monitor;
        return Math.Abs(screen.Left - bounds.Left) <= 1 && Math.Abs(screen.Top - bounds.Top) <= 1 &&
            Math.Abs(screen.Right - bounds.Right) <= 1 && Math.Abs(screen.Bottom - bounds.Bottom) <= 1;
    }

    public static void EnterFullscreen(IntPtr window, string browserPath, string appTitle)
    {
        if (!IsAppWindow(window, browserPath, appTitle) || IsFullscreen(window)) return;
        PostMessage(window, KeyDown, new IntPtr(F11), new IntPtr(0x570001));
        PostMessage(window, KeyUp, new IntPtr(F11), new IntPtr(unchecked((int)0xC0570001)));
    }
}
