import os
import sys

# Windows High-DPI and Rendering Fixes
os.environ["QT_AUTO_SCREEN_SCALE_FACTOR"] = "1"
os.environ["QT_API"] = "pyside6"

# Use D3D11 for stability on Windows while supporting transparency
os.environ["QT_OPENGL"] = "d3d11"

from PySide6.QtWidgets import (QApplication, QMainWindow, QWidget, QVBoxLayout, 
                             QHBoxLayout, QComboBox, QLineEdit, QPushButton, 
                             QLabel, QFrame, QGraphicsDropShadowEffect, QDialog,
                             QFormLayout, QScrollArea, QMessageBox)
from PySide6.QtCore import Qt, QSize, QPoint, QTimer, QUrl, QRect, QPropertyAnimation, QEasingCurve
from PySide6.QtGui import QColor, QPainter, QRegion, QIcon, QShortcut, QKeySequence
from PySide6.QtWebEngineWidgets import QWebEngineView
from config_manager import ConfigManager

class BezelOverlay(QWidget):
    """The master visual layer. Acts as a 3D metallic physical frame.
    Raised to the top to physically cover all content edges."""
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setAttribute(Qt.WA_TransparentForMouseEvents)
        self.radius = 50
        self.scale = 1.0
        self.base_color = "#111"
        self.border_color = "#444"
        self.rim_color = "#222" # Dark Grey Outer Rim
        self.bezel_w = 16 # Increased for a more premium, robust feel
        
    def set_params(self, radius, scale, base, border):
        self.radius = radius
        self.scale = scale
        self.base_color = base
        self.border_color = border
        self.bezel_w = int(16 * scale) # Adjusted base width
        self.update()

    def paintEvent(self, event):
        from PySide6.QtGui import QPainterPath, QLinearGradient, QPen
        painter = QPainter(self)
        painter.setRenderHint(QPainter.Antialiasing)
        
        rect = self.rect()
        
        # 1. Geometry Paths
        outer_path = QPainterPath()
        outer_path.addRoundedRect(rect, self.radius, self.radius)
        
        # Hole for the screen
        margin = self.bezel_w
        inner_rect = rect.adjusted(margin, margin, -margin, -margin)
        inner_r = max(0, self.radius - margin)
        inner_path = QPainterPath()
        inner_path.addRoundedRect(inner_rect, inner_r, inner_r)
        
        bezel_path = outer_path.subtracted(inner_path)
        
        # 2. Premium 3D Shader (Gradient with Depth)
        # We ensure the inner edge (near screen) has a HIGHLIGHT line (Chamfer)
        # so the curve is visible even against a black screen.
        highlight_color = QColor(255, 255, 255, 200) if self.base_color.lower() not in ["#ffffff", "#f0f0f0"] else QColor(100, 100, 100)
        
        grad = QLinearGradient(rect.topLeft(), rect.bottomRight())
        grad.setColorAt(0, self.rim_color)           # Edge 1
        grad.setColorAt(0.05, self.border_color)      
        grad.setColorAt(0.15, "#ffffff")              # 3D Highlight Peak
        grad.setColorAt(0.35, self.base_color)        # Main Body
        grad.setColorAt(0.65, self.base_color)        
        grad.setColorAt(0.85, "#ffffff")              # 3D Highlight Peak
        grad.setColorAt(0.95, self.border_color)      
        grad.setColorAt(1.0, self.rim_color)          # Edge 2
        
        painter.fillPath(bezel_path, grad)
        
        # 3. Structural Depth Lines (The 'Magic' detail)
        # Inner Chamfer (Light line defining the rounded corner)
        painter.setPen(QPen(QColor(255, 255, 255, 40), 1))
        painter.drawPath(inner_path)
        
        # Outer Rim Distinction
        painter.setPen(QPen(QColor(0, 0, 0, 100), 1))
        painter.drawPath(outer_path)
        
        # Shadow/Depth at the very edge of the screen hole
        inner_shadow_rect = inner_rect.adjusted(-1, -1, 1, 1)
        inner_shadow_path = QPainterPath()
        inner_shadow_path.addRoundedRect(inner_shadow_rect, inner_r + 1, inner_r + 1)
        painter.setPen(QPen(QColor(0, 0, 0, 120), 1))
        painter.drawPath(inner_shadow_path)

class PhoneSimulator(QMainWindow):
    def __init__(self):
        super().__init__()
        self.config_manager = ConfigManager()
        
        # Window Setup
        self.setWindowFlags(Qt.FramelessWindowHint | Qt.WindowStaysOnTopHint)
        self.setAttribute(Qt.WA_TranslucentBackground)
        
        self.old_pos = None
        self.is_immersion = False
        
        # ESC Shortcut (More reliable than EventFilter for WebEngine)
        self.esc_shortcut = QShortcut(QKeySequence("Esc"), self)
        self.esc_shortcut.activated.connect(self.on_esc_pressed)
        
        self.init_ui()
        self.apply_initial_layout()

    def apply_initial_layout(self):
        # Auto-detect screen size and scale down if needed
        screen = QApplication.primaryScreen().availableGeometry()
        device = self.get_current_device()
        
        # If phone height + control panel > screen height, scale down
        total_h = device["height"] + 150
        if total_h > screen.height() * 0.9:
            # We don't have visual scaling yet, so we just warn or adjust margins
            pass
            
        self.adjust_window_size()
        self.center_on_screen()

    def center_on_screen(self):
        screen = QApplication.primaryScreen().geometry()
        size = self.geometry()
        self.move((screen.width() - size.width()) // 2, (screen.height() - size.height()) // 2)

    def init_ui(self):
        # 1. Main Widget Setup
        self.central_widget = QWidget()
        self.setCentralWidget(self.central_widget)
        
        # 2. Main Layout (Vertical)
        self.main_layout = QVBoxLayout(self.central_widget)
        self.main_layout.setContentsMargins(0, 0, 0, 0)
        self.main_layout.setSpacing(0)

        # 3. Control Panel (Fixed Height)
        self.control_panel = QFrame()
        self.control_panel.setFixedHeight(50)
        self.control_panel.setStyleSheet("""
            QFrame {
                background: rgba(45, 55, 72, 240);
                border-bottom: 1px solid rgba(255, 255, 255, 40);
                color: white;
            }
            QLineEdit, QComboBox, QPushButton {
                background: rgba(255, 255, 255, 40);
                border: 1px solid rgba(255, 255, 255, 50);
                border-radius: 4px;
                padding: 4px 8px;
                color: white;
                font-size: 11px;
            }
            QPushButton:hover { background: rgba(255, 255, 255, 60); }
        """)
        self.cp_layout = QHBoxLayout(self.control_panel)
        self.cp_layout.setContentsMargins(15, 0, 15, 0)
        
        # Add Widgets to Control Panel
        self.cp_layout.addWidget(QLabel("裝置:"))
        self.device_combo = QComboBox()
        self.refresh_device_list()
        self.device_combo.currentIndexChanged.connect(self.on_device_changed)
        self.cp_layout.addWidget(self.device_combo)

        self.cp_layout.addWidget(QLabel("URL:"))
        self.url_input = QLineEdit()
        self.url_input.setText(self.config_manager.config["last_url"])
        self.url_input.setMinimumWidth(200) # Ensure it's not too small
        self.cp_layout.addWidget(self.url_input, 1) # Add stretch factor 1

        self.cp_layout.addWidget(QLabel("外框:"))
        self.frame_combo = QComboBox()
        self.frame_colors = {
            "沉穩黑": ("#111", "#444"), "華麗金": ("#d4af37", "#b8860b"),
            "優雅銀": ("#e5e5e5", "#a3a3a3"), "天空藍": ("#3498db", "#2980b9"),
            "珍珠白": ("#f0f0f0", "#ffffff")
        }
        self.frame_combo.addItems(list(self.frame_colors.keys()))
        self.frame_combo.currentIndexChanged.connect(self.on_frame_changed)
        self.cp_layout.addWidget(self.frame_combo)

        self.cp_layout.addWidget(QLabel("比例:"))
        self.scale_combo = QComboBox()
        self.scale_combo.addItems(["50%", "60%", "75%", "80%", "90%", "100%", "Auto"])
        self.scale_combo.setCurrentText(f"{int(self.config_manager.config['last_scale']*100)}%")
        self.scale_combo.currentIndexChanged.connect(self.on_scale_changed)
        self.cp_layout.addWidget(self.scale_combo)

        btn_add = QPushButton("+")
        btn_add.setFixedWidth(30)
        btn_add.clicked.connect(self.show_add_device_dialog)
        self.cp_layout.addWidget(btn_add)

        btn_manage = QPushButton("⚙")
        btn_manage.setFixedWidth(30)
        btn_manage.setToolTip("系統設定")
        btn_manage.clicked.connect(self.show_manage_devices_dialog)
        self.cp_layout.addWidget(btn_manage)

        btn_connect = QPushButton("連線")
        btn_connect.clicked.connect(self.load_url)
        self.cp_layout.addWidget(btn_connect)

        self.immersion_btn = QPushButton("沉浸")
        self.immersion_btn.clicked.connect(self.toggle_immersion)
        self.cp_layout.addWidget(self.immersion_btn)

        btn_close = QPushButton("關閉")
        btn_close.clicked.connect(self.close)
        self.cp_layout.addWidget(btn_close)

        self.main_layout.addWidget(self.control_panel)

        # 3b. Copyright Label (Stability: Kept exactly here between bar and phone)
        self.copy_label = QLabel("©mazylab studio.2026")
        self.copy_label.setStyleSheet("color: rgba(255,255,255,180); font-size: 10px; padding: 2px 15px; margin: 0px;")
        self.copy_label.setAlignment(Qt.AlignRight)
        self.main_layout.addWidget(self.copy_label)

        # 4. Phone Display Area (Flexible)
        self.phone_area = QWidget()
        self.phone_area_layout = QVBoxLayout(self.phone_area)
        self.phone_area_layout.setAlignment(Qt.AlignTop | Qt.AlignHCenter)
        # Final set: 10px gap to achieve the "shortened and uplifted" look
        self.phone_area_layout.setContentsMargins(10, 10, 10, 20) 
        
        self.setup_phone_frame()
        self.phone_area_layout.addWidget(self.phone_frame)
        self.main_layout.addWidget(self.phone_area)
        
        # 5. Stability Fix: Add stretch at the bottom to force components to stay at the top
        self.main_layout.addStretch(1)

        # Apply initial settings
        self.apply_config()
        self.update_clock()
        self.timer = QTimer(self)
        self.timer.timeout.connect(self.update_clock)
        self.timer.start(1000)

    def setup_phone_frame(self):
        # 1. Base Framework (Transparent)
        device = self.get_current_device()
        self.phone_frame = QFrame()
        self.phone_frame.setFixedSize(device["width"], device["height"])
        self.phone_frame.setStyleSheet("background: transparent;")
        self.phone_frame.setAttribute(Qt.WA_TranslucentBackground)
        
        # 2. Screen Content Layer (MIDDLE)
        self.screen_widget = QWidget(self.phone_frame)
        self.screen_widget.setStyleSheet("background: #000;") # Guaranteed black screen
        self.screen_layout = QVBoxLayout(self.screen_widget)
        self.screen_layout.setContentsMargins(0, 0, 0, 0)
        self.screen_layout.setSpacing(0)
        
        self.status_bar = QWidget()
        self.status_bar.setFixedHeight(44)
        self.sb_layout = QHBoxLayout(self.status_bar)
        self.sb_layout.setContentsMargins(25, 0, 25, 0)
        self.clock_label = QLabel("00:00")
        self.clock_label.setStyleSheet("font-weight: bold; color: white; font-size: 14px;")
        self.sb_layout.addWidget(self.clock_label)
        self.sb_layout.addStretch()
        self.status_icons = QLabel("📶 🔋")
        self.status_icons.setStyleSheet("color: white; font-size: 14px;")
        self.sb_layout.addWidget(self.status_icons)
        self.screen_layout.addWidget(self.status_bar)

        self.browser = QWebEngineView()
        self.browser.setStyleSheet("background: transparent;") 
        self.screen_layout.addWidget(self.browser)

        # 3. Dynamic Island (MIDDLE)
        self.island = QFrame(self.phone_frame)
        self.island.setFixedSize(120, 28)
        self.island.setStyleSheet("background: black; border-radius: 14px;")
        
        # 4. Bezel Overlay Layer (TOP)
        self.bezel_overlay = BezelOverlay(self.phone_frame)
        self.bezel_overlay.raise_()
        
        # 5. Copyright (Ultra-subtle, moved below screen)
        self.phone_copy = QLabel("©mazylab studio.2026", self.phone_frame)
        self.phone_copy.setStyleSheet("color: rgba(255,255,255,15); font-size: 8px;")
        self.phone_copy.setAlignment(Qt.AlignCenter)
        
        self.update_phone_style()

    def update_phone_copy_pos(self):
        if hasattr(self, 'phone_copy'):
            self.phone_copy.setFixedWidth(self.phone_frame.width())
            # Move to the very bottom rim area
            self.phone_copy.move(0, self.phone_frame.height() - 12)
            self.phone_copy.raise_()

    def update_phone_style(self):
        base, border = self.config_manager.config["last_frame_color"], self.config_manager.config["last_frame_border"]
        device = self.get_current_device()
        scale = self.config_manager.config.get("last_scale", 0.9) 
        
        scaled_w = int(device["width"] * scale) 
        scaled_h = int(device["height"] * scale)
        radius = int(device["radius"] * scale) 
        
        self.phone_frame.setFixedSize(scaled_w, scaled_h)
        
        if hasattr(self, 'bezel_overlay'):
            self.bezel_overlay.setFixedSize(scaled_w, scaled_h)
            self.bezel_overlay.set_params(radius, scale, base, border)
            self.bezel_overlay.raise_()
            
            # ABSOLUTE GEOMETRY (Fixed Gaps)
            bw = self.bezel_overlay.bezel_w
            bleed = 1 # Overlap to prevent transparency gaps
            m = bw - bleed
            w_inner, h_inner = scaled_w - 2*m, scaled_h - 2*m
            self.screen_widget.setGeometry(m, m, w_inner, h_inner)
            
            # PHYSICAL MASK: Stop the "square corners" from leaking outside
            from PySide6.QtGui import QRegion, QPainterPath
            mask_path = QPainterPath()
            mask_path.addRoundedRect(0, 0, w_inner, h_inner, radius - m, radius - m)
            self.screen_widget.setMask(QRegion(mask_path.toFillPolygon().toPolygon()))
            
        shadow = QGraphicsDropShadowEffect()
        shadow.setBlurRadius(int(40*scale)); shadow.setXOffset(0); shadow.setYOffset(int(15*scale))
        shadow.setColor(QColor(0, 0, 0, 100))
        self.phone_frame.setGraphicsEffect(shadow)
        
        # Status Bar Adjustments
        if base.lower() in ["#f0f0f0", "#ffffff", "#e5e5e5", "gold"]:
            text_color = "#333"
        else:
            text_color = "white"
        
        if hasattr(self, 'clock_label'):
            self.clock_label.setStyleSheet(f"font-weight: bold; color: {text_color}; font-size: 13px;")
        if hasattr(self, 'status_icons'):
            self.status_icons.setStyleSheet(f"color: {text_color}; font-size: 13px;")
            
        if hasattr(self, 'browser'):
            self.browser.setZoomFactor(scale)
            
        self.update_island_pos()
        self.update_phone_copy_pos()

    def update_island_pos(self):
        scale = self.config_manager.config.get("last_scale", 0.9)
        w = int(120 * scale)
        h = int(28 * scale)
        self.island.setFixedSize(w, h)
        self.island.setStyleSheet(f"background: black; border-radius: {h//2}px;")
        
        # Position island relative to screen content area
        # It must stay centered and aligned with the top of the browser area
        bw = self.bezel_overlay.bezel_w if hasattr(self, 'bezel_overlay') else 0
        self.island.move((self.phone_frame.width() - w) // 2, bw + int(10 * scale)) 
        
        self.island.raise_() 
        if hasattr(self, 'bezel_overlay'):
            self.bezel_overlay.raise_()
        if hasattr(self, 'phone_copy'):
            self.phone_copy.raise_()

    def refresh_device_list(self):
        self.device_combo.clear()
        for d in self.config_manager.get_all_devices():
            self.device_combo.addItem(f"{d['name']} ({d['width']}x{d['height']})")

    def get_current_device(self):
        idx = self.device_combo.currentIndex()
        devices = self.config_manager.get_all_devices()
        return devices[idx] if idx >= 0 else devices[0]

    def on_device_changed(self):
        self.update_phone_style()
        self.adjust_window_size()

    def adjust_window_size(self):
        device = self.get_current_device()
        scale = self.config_manager.config.get("last_scale", 0.9)
        scaled_w = int(device["width"] * scale)
        scaled_h = int(device["height"] * scale)
        
        # Window size should be slightly larger than scaled phone
        w = max(600, scaled_w + 100)
        h = max(500, scaled_h + 150)
        self.resize(w, h)

    def toggle_immersion(self):
        self.is_immersion = not self.is_immersion
        self.control_panel.setVisible(not self.is_immersion)
        self.copy_label.setVisible(not self.is_immersion)
        self.adjust_window_size()
        # Ensure the window has focus to catch the ESC key
        self.activateWindow()
        self.setFocus()

    def on_frame_changed(self):
        text = self.frame_combo.currentText()
        if text in self.frame_colors:
            base, border = self.frame_colors[text]
            self.config_manager.config["last_frame_color"], self.config_manager.config["last_frame_border"] = base, border
            self.update_phone_style()

    def on_scale_changed(self):
        text = self.scale_combo.currentText()
        if text == "Auto":
            # Auto logic can be more complex, but for now we fallback to 75%
            val = 0.75
        else:
            val = int(text.replace("%", "")) / 100.0
        
        self.config_manager.config["last_scale"] = val
        self.config_manager.save_config()
        self.update_phone_style()
        self.adjust_window_size()

    def load_url(self):
        url = self.url_input.text()
        if not url.startswith("http"): url = "http://" + url
        self.browser.setUrl(QUrl(url))
        self.config_manager.config["last_url"] = url
        self.config_manager.save_config()

    def update_clock(self):
        from datetime import datetime
        self.clock_label.setText(datetime.now().strftime("%H:%M"))

    def apply_config(self):
        idx = self.config_manager.config["last_device_index"]
        if 0 <= idx < self.device_combo.count():
            self.device_combo.setCurrentIndex(idx)
        self.load_url()

    # --- Mouse Events for Dragging ---
    def mousePressEvent(self, event):
        if event.button() == Qt.LeftButton:
            self.old_pos = event.globalPos()

    def mouseMoveEvent(self, event):
        if self.old_pos is not None:
            delta = QPoint(event.globalPos() - self.old_pos)
            self.move(self.pos() + delta)
            self.old_pos = event.globalPos()

    def mouseReleaseEvent(self, event):
        self.old_pos = None

    def on_esc_pressed(self):
        # ESC always toggles the control panel visibility
        self.is_immersion = not self.is_immersion
        self.control_panel.setVisible(not self.is_immersion)
        self.copy_label.setVisible(not self.is_immersion)
        self.adjust_window_size()
        self.activateWindow()
        self.setFocus()

    def keyPressEvent(self, event):
        # QShortcut already handles ESC, but we keep this for other keys if needed
        super().keyPressEvent(event)

    # --- Device Management Dialogs ---
    def show_add_device_dialog(self):
        dialog = QDialog(self)
        dialog.setWindowTitle("新增自定義設備")
        dialog.setFixedWidth(300)
        layout = QFormLayout(dialog)
        
        name_edit = QLineEdit()
        width_edit = QLineEdit()
        height_edit = QLineEdit()
        radius_edit = QLineEdit("50")

        layout.addRow("名稱:", name_edit)
        layout.addRow("寬度 (px):", width_edit)
        layout.addRow("高度 (px):", height_edit)
        layout.addRow("圓角 (px):", radius_edit)

        btn_box = QHBoxLayout()
        btn_save = QPushButton("新增")
        btn_save.clicked.connect(dialog.accept)
        btn_box.addWidget(btn_save)
        layout.addRow(btn_box)

        if dialog.exec() == QDialog.Accepted:
            name = name_edit.text()
            try:
                w, h, r = int(width_edit.text()), int(height_edit.text()), int(radius_edit.text())
                self.config_manager.add_custom_device(name, w, h, r)
                self.refresh_device_list()
                self.device_combo.setCurrentIndex(self.device_combo.count() - 1)
            except ValueError:
                QMessageBox.warning(self, "錯誤", "請輸入數值")

    def show_manage_devices_dialog(self):
        dialog = QDialog(self)
        dialog.setWindowTitle("管理自定義設備")
        dialog.setFixedWidth(350)
        layout = QVBoxLayout(dialog)

        scroll = QScrollArea()
        container = QWidget()
        scroll_layout = QVBoxLayout(container)
        
        custom_devices = self.config_manager.config["custom_devices"]
        if not custom_devices:
            scroll_layout.addWidget(QLabel("尚無自定義設備"))
        else:
            for i, d in enumerate(custom_devices):
                item_row = QHBoxLayout()
                item_row.addWidget(QLabel(f"{d['name']} ({d['width']}x{d['height']})"))
                
                btn_edit = QPushButton("編輯")
                btn_edit.clicked.connect(lambda checked, idx=i: self.show_edit_device_dialog(idx, dialog))
                item_row.addWidget(btn_edit)
                
                btn_del = QPushButton("刪除")
                btn_del.clicked.connect(lambda checked, idx=i: self.delete_device(idx, dialog))
                item_row.addWidget(btn_del)
                scroll_layout.addLayout(item_row)

        scroll.setWidget(container)
        scroll.setWidgetResizable(True)
        layout.addWidget(scroll)
        
        dialog.exec()

    def show_edit_device_dialog(self, index, parent_dialog):
        device = self.config_manager.config["custom_devices"][index]
        dialog = QDialog(self)
        dialog.setWindowTitle(f"編輯 - {device['name']}")
        dialog.setFixedWidth(300)
        layout = QFormLayout(dialog)
        
        name_edit = QLineEdit(device["name"])
        width_edit = QLineEdit(str(device["width"]))
        height_edit = QLineEdit(str(device["height"]))
        radius_edit = QLineEdit(str(device["radius"]))

        layout.addRow("名稱:", name_edit)
        layout.addRow("寬度 (px):", width_edit)
        layout.addRow("高度 (px):", height_edit)
        layout.addRow("圓角 (px):", radius_edit)

        btn_save = QPushButton("儲存修改")
        btn_save.clicked.connect(dialog.accept)
        layout.addRow(btn_save)

        if dialog.exec() == QDialog.Accepted:
            try:
                name = name_edit.text()
                w, h, r = int(width_edit.text()), int(height_edit.text()), int(radius_edit.text())
                self.config_manager.update_custom_device(index, name, w, h, r)
                self.refresh_device_list()
                parent_dialog.reject() # Refresh list by re-opening
                self.show_manage_devices_dialog()
            except ValueError:
                QMessageBox.warning(self, "錯誤", "請輸入有效數值")

    def delete_device(self, idx, dialog):
        if QMessageBox.question(self, "確認", "確定要刪除此設備嗎？") == QMessageBox.Yes:
            self.config_manager.delete_custom_device(idx)
            self.refresh_device_list()
            dialog.reject() # Close and re-open to refresh easily
            self.show_manage_devices_dialog()

    # Remove redundant duplicate mouse events that were at the end of the file

if __name__ == "__main__":
    app = QApplication(sys.argv)
    window = PhoneSimulator()
    window.show()
    sys.exit(app.exec())
