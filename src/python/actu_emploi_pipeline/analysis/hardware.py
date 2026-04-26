from __future__ import annotations

import platform
import shutil
import subprocess
import sys
from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class HardwareAcceleration:
    detected: bool
    device_kind: str
    device_name: str | None
    backend_hint: str | None


def _run(command: list[str]) -> str:
    startupinfo = None
    creationflags = 0
    if sys.platform == "win32":
        startupinfo = subprocess.STARTUPINFO()
        startupinfo.dwFlags |= subprocess.STARTF_USESHOWWINDOW
        startupinfo.wShowWindow = subprocess.SW_HIDE
        creationflags = subprocess.CREATE_NO_WINDOW

    try:
        result = subprocess.run(
            command,
            capture_output=True,
            check=False,
            encoding="utf-8",
            errors="ignore",
            timeout=4,
            startupinfo=startupinfo,
            creationflags=creationflags,
        )
    except (OSError, subprocess.SubprocessError):
        return ""

    return "\n".join(part for part in [result.stdout, result.stderr] if part)


def _detect_windows_amd_gpu() -> HardwareAcceleration | None:
    powershell = shutil.which("powershell") or shutil.which("pwsh")
    if not powershell:
        return _detect_windows_amd_gpu_from_registry()

    output = _run(
        [
            powershell,
            "-NoProfile",
            "-Command",
            "Get-CimInstance Win32_VideoController | Select-Object -ExpandProperty Name",
        ]
    )
    for line in output.splitlines():
        name = line.strip()
        if "amd" in name.lower() or "radeon" in name.lower():
            return HardwareAcceleration(
                detected=True,
                device_kind="amd-gpu",
                device_name=name,
                backend_hint="directml-or-vulkan",
            )
    return _detect_windows_amd_gpu_from_registry()


def _clean_windows_device_name(value: str) -> str:
    if ";" in value:
        value = value.rsplit(";", 1)[-1]
    return value.strip()


def _detect_windows_amd_gpu_from_registry() -> HardwareAcceleration | None:
    try:
        import winreg
    except ImportError:
        return None

    candidates: list[str] = []
    try:
        root = winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, r"SYSTEM\CurrentControlSet\Enum\PCI")
    except OSError:
        return None

    for first_index in range(winreg.QueryInfoKey(root)[0]):
        try:
            first_key = winreg.OpenKey(root, winreg.EnumKey(root, first_index))
        except OSError:
            continue

        for second_index in range(winreg.QueryInfoKey(first_key)[0]):
            try:
                device_key = winreg.OpenKey(first_key, winreg.EnumKey(first_key, second_index))
            except OSError:
                continue

            for value_name in ["FriendlyName", "DeviceDesc", "Mfg"]:
                try:
                    value, _ = winreg.QueryValueEx(device_key, value_name)
                except OSError:
                    continue
                text = str(value)
                lowered = text.lower()
                if "radeon" in lowered:
                    candidates.insert(0, text)
                elif "amd" in lowered:
                    candidates.append(text)

    for candidate in candidates:
        lowered = candidate.lower()
        if "radeon" in lowered or "amd graphics" in lowered:
            return HardwareAcceleration(
                detected=True,
                device_kind="amd-gpu",
                device_name=_clean_windows_device_name(candidate),
                backend_hint="directml-or-vulkan",
            )

    return None


def _detect_linux_amd_gpu() -> HardwareAcceleration | None:
    output = ""
    if shutil.which("rocm-smi"):
        output = _run(["rocm-smi", "--showproductname"])
    if not output and shutil.which("lspci"):
        output = _run(["lspci"])

    for line in output.splitlines():
        lowered = line.lower()
        if "amd" in lowered or "advanced micro devices" in lowered or "radeon" in lowered:
            return HardwareAcceleration(
                detected=True,
                device_kind="amd-gpu",
                device_name=line.strip(),
                backend_hint="rocm-or-vulkan",
            )
    return None


def detect_hardware_acceleration() -> HardwareAcceleration:
    system = platform.system().lower()
    detected = _detect_windows_amd_gpu() if system == "windows" else _detect_linux_amd_gpu()

    if detected:
        return detected

    return HardwareAcceleration(
        detected=False,
        device_kind="cpu",
        device_name=None,
        backend_hint=None,
    )
