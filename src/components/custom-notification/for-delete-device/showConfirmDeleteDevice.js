// src/components/sidebar_components/Devices_contents/Devices_contents_functions/showDeleteDeviceConfirm.js

import React from "react";
import ReactDOM from "react-dom/client";
import ConfirmDeleteDevice from "./ConfirmDeleteDevice";

/**
 * showDeleteDeviceConfirm - mounts ConfirmDeleteDevice and resolves boolean result
 */
export const showDeleteDeviceConfirm = ({ 
  message = "Delete this device?", 
  subText = "This action cannot be undone. All device data will be permanently removed.", 
  confirmText = "Delete", 
  cancelText = "Cancel" 
} = {}) => {
  return new Promise((resolve) => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = ReactDOM.createRoot(container);

    const handleClose = (result) => {
      try {
        resolve(result);
      } finally {
        // unmount and remove DOM node
        setTimeout(() => {
          root.unmount();
          container.remove();
        }, 0);
      }
    };

    // Use React.createElement to avoid JSX parsing issues in this file
    const element = React.createElement(ConfirmDeleteDevice, {
      message,
      subText,
      confirmText,
      cancelText,
      onClose: handleClose,
    });

    root.render(element);
  });
};

export default showDeleteDeviceConfirm;