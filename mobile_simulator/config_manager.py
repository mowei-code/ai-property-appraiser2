import json
import os

class ConfigManager:
    DEFAULT_DEVICES = [
        {"name": "iPhone 17", "width": 393, "height": 852, "radius": 55},
        {"name": "iPhone 16", "width": 393, "height": 852, "radius": 55},
        {"name": "iPhone 13/14/15", "width": 390, "height": 844, "radius": 50},
        {"name": "iPhone Pro Max", "width": 430, "height": 932, "radius": 55},
        {"name": "iPhone Mini", "width": 375, "height": 812, "radius": 45},
    ]

    def __init__(self, config_path="config.json"):
        self.config_path = config_path
        self.config = self.load_config()

    def load_config(self):
        if os.path.exists(self.config_path):
            with open(self.config_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        return {
            "last_url": "http://localhost:5173",
            "last_device_index": 2,
            "last_frame_color": "#111",
            "last_frame_border": "#444",
            "last_scale": 0.7,
            "custom_devices": []
        }

    def save_config(self):
        with open(self.config_path, 'w', encoding='utf-8') as f:
            json.dump(self.config, f, indent=4, ensure_ascii=False)

    def get_all_devices(self):
        return self.DEFAULT_DEVICES + self.config.get("custom_devices", [])

    def add_custom_device(self, name, width, height, radius):
        self.config["custom_devices"].append({
            "name": name,
            "width": width,
            "height": height,
            "radius": radius
        })
        self.save_config()

    def delete_custom_device(self, index):
        # Index is relative to custom_devices list
        if 0 <= index < len(self.config["custom_devices"]):
            self.config["custom_devices"].pop(index)
            self.save_config()

    def update_custom_device(self, index, name, width, height, radius):
        if 0 <= index < len(self.config["custom_devices"]):
            self.config["custom_devices"][index] = {
                "name": name,
                "width": width,
                "height": height,
                "radius": radius
            }
            self.save_config()
