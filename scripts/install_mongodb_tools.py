#!/usr/bin/env python3
"""
Install MongoDB Community Server and MongoDB Compass.

This script is interactive and intentionally conservative:
- It prints each command before execution.
- It asks for confirmation before privileged install commands.
"""

from __future__ import annotations

import platform
import shutil
import subprocess
from dataclasses import dataclass
from typing import List


@dataclass
class Step:
    description: str
    command: List[str]
    requires_confirm: bool = True


def run_step(step: Step) -> None:
    print(f"\n[step] {step.description}")
    print("       " + " ".join(step.command))

    if step.requires_confirm:
        answer = input("Run this command now? [y/N]: ").strip().lower()
        if answer != "y":
            print("[skip] command skipped")
            return

    result = subprocess.run(step.command, check=False)
    if result.returncode != 0:
        print(f"[warn] command exited with code {result.returncode}")


def require_tool(tool: str) -> bool:
    return shutil.which(tool) is not None


def windows_steps() -> List[Step]:
    return [
        Step(
            description="Install MongoDB Community Server (Windows via winget)",
            command=["winget", "install", "--id", "MongoDB.Server", "--exact", "--accept-package-agreements", "--accept-source-agreements"],
        ),
        Step(
            description="Install MongoDB Compass (Windows via winget)",
            command=["winget", "install", "--id", "MongoDB.Compass.Full", "--exact", "--accept-package-agreements", "--accept-source-agreements"],
        ),
    ]


def mac_steps() -> List[Step]:
    return [
        Step(
            description="Tap MongoDB Homebrew repository",
            command=["brew", "tap", "mongodb/brew"],
        ),
        Step(
            description="Install MongoDB Community Server 7.0",
            command=["brew", "install", "mongodb-community@7.0"],
        ),
        Step(
            description="Install MongoDB Compass",
            command=["brew", "install", "--cask", "mongodb-compass"],
        ),
    ]


def linux_steps() -> List[Step]:
    return [
        Step(
            description="Update apt package index",
            command=["sudo", "apt-get", "update"],
        ),
        Step(
            description="Install MongoDB Community Server package (mongodb-org)",
            command=["sudo", "apt-get", "install", "-y", "mongodb-org"],
        ),
        Step(
            description="Install MongoDB Compass via snap",
            command=["sudo", "snap", "install", "mongodb-compass"],
        ),
    ]


def main() -> int:
    system = platform.system().lower()
    print(f"Detected platform: {system}")

    if system == "windows":
        if not require_tool("winget"):
            print("winget is required on Windows. Install App Installer from Microsoft Store.")
            return 1
        steps = windows_steps()
    elif system == "darwin":
        if not require_tool("brew"):
            print("Homebrew is required on macOS. Install from https://brew.sh")
            return 1
        steps = mac_steps()
    elif system == "linux":
        if not require_tool("apt-get"):
            print("This script currently supports Debian/Ubuntu style apt-based Linux only.")
            return 1
        steps = linux_steps()
    else:
        print(f"Unsupported platform: {system}")
        return 1

    for step in steps:
        run_step(step)

    print("\nCompleted MongoDB server/Compass installation flow.")
    print("Verify MongoDB service and Compass launch manually.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
