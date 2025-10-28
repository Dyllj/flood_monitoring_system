import React from "react";
import ReactDOM from "react-dom/client";
// import the confirm component (include extension to avoid resolver issues)
import ConfirmCard from "./delete-contact.jsx";

/**
 * showDeleteConfirm - mounts ConfirmCard and resolves boolean result
 */
export const showDeleteConfirm = ({ message = "Are you sure?", subText = "", confirmText = "Delete", cancelText = "Cancel" } = {}) => {
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
    const element = React.createElement(ConfirmCard, {
      message,
      subText,
      confirmText,
      cancelText,
      onClose: handleClose,
    });

    root.render(element);
  });
};

export default showDeleteConfirm;