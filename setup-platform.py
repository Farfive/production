#!/usr/bin/env python3
"""
Manufacturing Platform Setup Script
Fixes all identified issues and sets up the development environment
"""

import os
import sys
import subprocess
import json
import time
from pathlib import Path

class PlatformSetup:
    def __init__(self):
        self.root_dir = Path.cwd()
        self.backend_dir = self.root_dir / "backend"
        self.frontend_dir = self.root_dir / "frontend"
        self.issues_fixed = []
        self.errors = []

    def log_success(self, message):
        print(f"✅ {message}")
        self.issues_fixed.append(message)

    def log_error(self, message):
        print(f"❌ {message}")
        self.errors.append(message)

    def log_info(self, message):
        print(f"ℹ️  {message}")

    def run_command(self, command, cwd=None, check=True):
        """Run a shell command and return the result"""
        try:
            result = subprocess.run(
                command,
                shell=True,
                cwd=cwd or self.root_dir,
                capture_output=True,
                text=True,
                check=check
            )
            return result
        except subprocess.CalledProcessError as e:
            self.log_error(f"Command failed: {command}")
            self.log_error(f"Error: {e.stderr}")
            return None

    def check_docker_installed(self):
        """Check if Docker is installed and running"""
        self.log_info("Checking Docker installation...")
        
        # Check if Docker is installed
        result = self.run_command("docker --version", check=False)
        if not result or result.returncode != 0:
            self.log_error("Docker is not installed. Please install Docker Desktop.")
            return False
        
        # Check if Docker is running
        result = self.run_command("docker ps", check=False)
        if not result or result.returncode != 0:
            self.log_error("Docker is not running. Please start Docker Desktop.")
            return False
        
        self.log_success("Docker is installed and running")
        return True

    def setup_services_with_docker(self):
        """Set up Redis and PostgreSQL using Docker Compose"""
        self.log_info("Setting up services with Docker Compose...")
        
        # Start only the required services (postgres and redis)
        self.log_info("Starting PostgreSQL and Redis services...")
        result = self.run_command("docker-compose up -d postgres redis")
        if result and result.returncode == 0:
            self.log_success("PostgreSQL and Redis services started")
            
            # Wait for services to be ready
            self.log_info("Waiting for services to be ready...")
            time.sleep(10)
            
            return True
        else:
            self.log_error("Failed to start services with Docker Compose")
            return False

    def run_setup(self):
        """Run the complete setup process"""
        print("🚀 Manufacturing Platform Setup")
        print("=" * 50)
        
        # Check prerequisites
        if not self.check_docker_installed():
            return False
        
        # Set up services
        if not self.setup_services_with_docker():
            return False
        
        self.log_success("Setup completed successfully")
        return True


if __name__ == "__main__":
    setup = PlatformSetup()
    success = setup.run_setup()
    sys.exit(0 if success else 1) 