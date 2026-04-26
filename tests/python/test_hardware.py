from __future__ import annotations

import sys
import unittest
from pathlib import Path
from unittest.mock import patch

ROOT_DIR = Path(__file__).resolve().parents[2]
PYTHON_SRC_DIR = ROOT_DIR / "src" / "python"

if str(PYTHON_SRC_DIR) not in sys.path:
    sys.path.insert(0, str(PYTHON_SRC_DIR))

from actu_emploi_pipeline.analysis import hardware


class HardwareTest(unittest.TestCase):
    def test_detects_windows_amd_gpu_from_video_controller_output(self) -> None:
        with patch("actu_emploi_pipeline.analysis.hardware.shutil.which", return_value="powershell"):
            with patch(
                "actu_emploi_pipeline.analysis.hardware._run",
                return_value="Virtual Desktop Monitor\nAMD Radeon(TM) Graphics\n",
            ):
                result = hardware._detect_windows_amd_gpu()

        self.assertIsNotNone(result)
        assert result is not None
        self.assertEqual(result.device_kind, "amd-gpu")
        self.assertEqual(result.device_name, "AMD Radeon(TM) Graphics")

    def test_falls_back_to_windows_registry_when_wmi_is_denied(self) -> None:
        with patch("actu_emploi_pipeline.analysis.hardware.shutil.which", return_value="powershell"):
            with patch("actu_emploi_pipeline.analysis.hardware._run", return_value="Access denied"):
                with patch(
                    "actu_emploi_pipeline.analysis.hardware._detect_windows_amd_gpu_from_registry",
                    return_value=hardware.HardwareAcceleration(
                        detected=True,
                        device_kind="amd-gpu",
                        device_name="AMD Radeon RX 7600M XT",
                        backend_hint="directml-or-vulkan",
                    ),
                ):
                    result = hardware._detect_windows_amd_gpu()

        self.assertIsNotNone(result)
        assert result is not None
        self.assertEqual(result.device_name, "AMD Radeon RX 7600M XT")


if __name__ == "__main__":
    unittest.main()
