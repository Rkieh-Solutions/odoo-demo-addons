/** @odoo-module **/

import { registry } from "@web/core/registry";
import { useService } from "@web/core/utils/hooks";
import { _t } from "@web/core/l10n/translation";
import { standardFieldProps } from "@web/views/fields/standard_field_props";
import { Component, useRef, useState, onWillUnmount } from "@odoo/owl";

/**
 * Binary/Image field widget that lets the user capture a photo from the device
 * camera (live preview via getUserMedia) or pick/take one through a native file
 * input. The captured image is stored as base64 in the bound field.
 */
export class CameraCaptureField extends Component {
    static template = "n8n_doc_scanner.CameraCapture";
    static props = {
        ...standardFieldProps,
        filenameField: { type: String, optional: true },
    };

    setup() {
        this.notification = useService("notification");
        this.videoRef = useRef("video");
        this.canvasRef = useRef("canvas");
        this.fileInputRef = useRef("fileInput");
        this.state = useState({ streaming: false, loading: false });
        this.stream = null;
        onWillUnmount(() => this.stopCamera());
    }

    get value() {
        return this.props.record.data[this.props.name];
    }

    get imageUrl() {
        if (this.value) {
            return `data:image/png;base64,${this.value}`;
        }
        return false;
    }

    async _commit(base64, filename) {
        const changes = { [this.props.name]: base64 };
        if (this.props.filenameField) {
            changes[this.props.filenameField] = filename;
        }
        await this.props.record.update(changes);
    }

    async startCamera() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            this.notification.add(
                _t("Live camera is not available here. Use 'Take / Upload Photo' instead."),
                { type: "warning" }
            );
            return;
        }
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: { ideal: "environment" } },
                audio: false,
            });
            this.state.streaming = true;
            // Wait for the template to render the <video> element.
            await Promise.resolve();
            const video = this.videoRef.el;
            if (video) {
                video.srcObject = this.stream;
                await video.play();
            }
        } catch (err) {
            this.stopCamera();
            this.notification.add(
                _t("Cannot access the camera: %s", err.message || err.name),
                { type: "danger" }
            );
        }
    }

    stopCamera() {
        if (this.stream) {
            this.stream.getTracks().forEach((track) => track.stop());
            this.stream = null;
        }
        this.state.streaming = false;
    }

    async capture() {
        const video = this.videoRef.el;
        const canvas = this.canvasRef.el;
        if (!video || !canvas) {
            return;
        }
        canvas.width = video.videoWidth || 1280;
        canvas.height = video.videoHeight || 720;
        canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/png");
        const base64 = dataUrl.split(",")[1];
        await this._commit(base64, `scan_${Date.now()}.png`);
        this.stopCamera();
    }

    triggerFileInput() {
        if (this.fileInputRef.el) {
            this.fileInputRef.el.click();
        }
    }

    async onFileChange(ev) {
        const file = ev.target.files && ev.target.files[0];
        if (!file) {
            return;
        }
        this.state.loading = true;
        try {
            const base64 = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result.split(",")[1]);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
            await this._commit(base64, file.name);
        } catch (err) {
            this.notification.add(_t("Could not read the file."), { type: "danger" });
        } finally {
            this.state.loading = false;
            ev.target.value = "";
        }
    }

    async clearImage() {
        this.stopCamera();
        await this._commit(false, false);
    }
}

export const cameraCaptureField = {
    component: CameraCaptureField,
    displayName: _t("Camera Capture"),
    supportedTypes: ["binary"],
    extractProps: ({ options }) => ({
        filenameField: options.filename,
    }),
};

registry.category("fields").add("camera_capture", cameraCaptureField);
