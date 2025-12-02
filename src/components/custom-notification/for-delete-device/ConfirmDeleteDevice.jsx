import React, { useEffect } from "react";
import styled from "styled-components";

const ConfirmDeleteDevice = ({
  onClose,
  message = "Delete log",
  subText = "Are you sure you want to delete this log? This action cannot be undone.",
  confirmText = "Delete",
  cancelText = "Cancel",
}) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <Overlay onClick={() => onClose(false)}>
      <StyledWrapper onClick={(e) => e.stopPropagation()}>
        <div className="card" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
          <div className="header">
            <div className="image" aria-hidden="true">
              <svg
                aria-hidden="true"
                stroke="currentColor"
                strokeWidth="1.5"
                viewBox="0 0 24 24"
                fill="none"
              >
                <path
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              </svg>
            </div>

            <div className="content">
              <span id="confirm-title" className="title">
                {message}
              </span>
              {subText && <p className="message">{subText}</p>}
            </div>
          </div>

          <div className="actions">
            <button className="desactivate" onClick={() => onClose(true)}>
              {confirmText}
            </button>
            <button className="cancel" onClick={() => onClose(false)}>
              {cancelText}
            </button>
          </div>
        </div>
      </StyledWrapper>
    </Overlay>
  );
};

// ====================
// 💅 Styled Components
// ====================
const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
`;

const StyledWrapper = styled.div`
  .card {
    overflow: hidden;
    background-color: #ffffff;
    border-radius: 0.75rem;
    text-align: center;
    max-width: 1200px;
    justify-content: center;
    align-items: center;
    width: min(100%, 1200px);
    box-shadow: 0 25px 40px rgba(0, 0, 0, 0.1),
      0 15px 15px rgba(0, 0, 0, 0.05);
    animation: fadeIn 0.2s ease-in-out;
  }

  .header {
    padding: 2rem 2rem 1rem 2rem;
    background-color: #ffffff;
  }

  .image {
    display: flex;
    margin: 0 auto;
    background-color: #fee2e2;
    justify-content: center;
    align-items: center;
    width: 4rem;
    height: 4rem;
    border-radius: 50%;
  }

  .image svg {
    color: #dc2626;
    width: 2rem;
    height: 2rem;
  }

  .title {
    color: #111827;
    font-size: 1.35rem;
    font-weight: 700;
    margin-top: 1rem;
    display: block;
  }

  .message {
    margin-top: 0.5rem;
    color: #6b7280;
    font-size: 1rem;
    line-height: 1.4rem;
  }

  .actions {
    margin-top: 1.5rem;
    display: flex;
    justify-content: center;
    gap: 1rem;
    padding: 1rem 1.5rem 1.5rem;
    background-color: #f9fafb;
    border-top: 1px solid #e5e7eb;
  }

  .desactivate,
  .cancel {
    flex: 1;
    max-width: 160px;
    height: 3rem;
    border-radius: 0.5rem;
    font-weight: 600;
    cursor: pointer;
    font-size: 1rem;
    transition: background-color 0.2s ease;
  }

  .desactivate {
    background-color: #dc2626;
    color: #ffffff;
    border: none;
  }

  .desactivate:hover {
    background-color: #b91c1c;
  }

  .cancel {
    background-color: #ffffff;
    color: #374151;
    border: 1px solid #d1d5db;
  }

  .cancel:hover {
    background-color: #f3f4f6;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: scale(0.96);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }
`;

export default ConfirmDeleteDevice;
