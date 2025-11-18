// src/components/modals/EditAlertTemplateModal.jsx

import { useState, useEffect } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../../../auth/firebase_auth";
import "./EditAlertTemplateModal.css";


const EditAlertTemplateModal = ({ onClose }) => {
  const [template, setTemplate] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const REQUIRED_PLACEHOLDERS = [
    "${type.toUpperCase()}",
    "${location}",
    "${distance}",
    "${status}",
    "${alertTime}"
  ];

  const DEFAULT_TEMPLATE = `\${type.toUpperCase()} FLOOD ALERT
Maayung Adlaw!
Ang tubig sa \${location} naabot na sa lebel nga \${distance}m (\${status}).
Pag-alerto ug pag-andam sa posibleng baha.
Time: \${alertTime}
- Sent by Molave Municipal Risk Reduction and Management Office`;

  useEffect(() => {
    loadTemplate();
  }, []);

  const loadTemplate = async () => {
    try {
      const docRef = doc(db, "settings", "alertTemplate");
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        setTemplate(docSnap.data().template || DEFAULT_TEMPLATE);
      } else {
        setTemplate(DEFAULT_TEMPLATE);
      }
    } catch (err) {
      console.error("Failed to load template:", err);
      setTemplate(DEFAULT_TEMPLATE);
    } finally {
      setLoading(false);
    }
  };

  const validateTemplate = (text) => {
    const missingPlaceholders = REQUIRED_PLACEHOLDERS.filter(
      placeholder => !text.includes(placeholder)
    );

    if (missingPlaceholders.length > 0) {
      return {
        valid: false,
        message: `Missing required placeholders: ${missingPlaceholders.join(", ")}`
      };
    }

    return { valid: true };
  };

  const handleSave = async () => {
    const validation = validateTemplate(template);
    
    if (!validation.valid) {
      setError(validation.message);
      return;
    }

    setSaving(true);
    setError("");

    try {
      const docRef = doc(db, "settings", "alertTemplate");
      await setDoc(docRef, {
        template: template,
        lastUpdated: new Date(),
        updatedBy: "admin"
      });

      alert("Alert template saved successfully!");
      onClose();
    } catch (err) {
      console.error("Failed to save template:", err);
      setError("Failed to save template. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (window.confirm("Reset to default template? This will discard your changes.")) {
      setTemplate(DEFAULT_TEMPLATE);
      setError("");
    }
  };

  const insertPlaceholder = (placeholder) => {
    const textarea = document.getElementById("template-textarea");
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newTemplate = template.substring(0, start) + placeholder + template.substring(end);
    setTemplate(newTemplate);
    
    // Set cursor position after inserted placeholder
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + placeholder.length, start + placeholder.length);
    }, 0);
  };

  if (loading) {
    return (
      <div className="modal-overlay">
        <div className="alert-template-modal">
          <p>Loading template...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="alert-template-modal" onClick={(e) => e.stopPropagation()}>
        <h2>Edit Alert Message Template</h2>
        
        <div className="template-info">
          <p><strong>Required Placeholders:</strong></p>
          <p className="info-text">
            These placeholders must be included in your template and will be automatically replaced with actual values:
          </p>
          <div className="placeholder-buttons">
            {REQUIRED_PLACEHOLDERS.map((placeholder) => (
              <button
                key={placeholder}
                className="placeholder-btn"
                onClick={() => insertPlaceholder(placeholder)}
                title="Click to insert at cursor position"
              >
                {placeholder}
              </button>
            ))}
          </div>
        </div>

        <div className="template-editor">
          <label htmlFor="template-textarea">Message Template:</label>
          <textarea
            id="template-textarea"
            value={template}
            onChange={(e) => {
              setTemplate(e.target.value);
              setError("");
            }}
            rows={12}
            placeholder="Enter your alert message template..."
          />
          <p className="char-count">{template.length} characters</p>
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="template-preview">
          <h3>Preview (with sample data):</h3>
          <div className="preview-box">
            {template
              .replace("${type.toUpperCase()}", "AUTOMATIC")
              .replace("${location}", "Barangay San Isidro")
              .replace("${distance}", "3.45")
              .replace("${status}", "Elevated")
              .replace("${alertTime}", new Date().toLocaleString("en-PH", {
                timeZone: "Asia/Manila",
                dateStyle: "short",
                timeStyle: "short"
              }))
            }
          </div>
        </div>

        <div className="modal-actions">
          <button onClick={handleSave} disabled={saving} className="save-message-btn">
            {saving ? "Saving..." : "Save Template"}
          </button>
          <button onClick={handleReset} className="reset-message-btn" disabled={saving}>
            Reset to Default
          </button>
          <button onClick={onClose} className="cancel-message-btn" disabled={saving}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditAlertTemplateModal;