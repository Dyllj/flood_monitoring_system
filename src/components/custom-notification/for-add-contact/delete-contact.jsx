import React, { useEffect } from 'react';
import styled from 'styled-components';

const Card = ({
  onClose,
  message = "Deactivate account",
  subText = "",
  confirmText = "Deactivate",
  cancelText = "Cancel"
}) => {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
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
              <span id="confirm-title" className="title">{message}</span>
              {subText ? <p className="message">{subText}</p> : null}
            </div>

            <div className="actions">
              <button className="desactivate" type="button" onClick={() => onClose(true)}>
                {confirmText}
              </button>
              <button className="cancel" type="button" onClick={() => onClose(false)}>
                {cancelText}
              </button>
            </div>
          </div>
        </div>
      </StyledWrapper>
    </Overlay>
  );
};

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
    position: relative;
    background-color: #ffffff;
    border-radius: 0.75rem;
    text-align: left;
    max-width: 30rem;
    width: min(100%, 1200px);
    box-shadow:
      0 25px 40px rgba(0, 0, 0, 0.1),
      0 15px 15px rgba(0, 0, 0, 0.05);
  }

  .header {
    padding: 1.75rem 2.5rem 1.5rem 2.5rem;
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
    border-radius: 9999px;
  }

  .image svg {
    color: #dc2626;
    width: 2rem;
    height: 2rem;
  }

  .content {
    margin-top: 0.75rem;
    text-align: center;
  }

  .title {
    color: #111827;
    font-size: 1.45rem;
    font-weight: 700;
    line-height: 1.9rem;
  }

  .message {
    margin-top: 0.5rem;
    color: #6b7280;
    font-size: 1rem;
    line-height: 1.4rem;
  }

  /* ✅ Side by side wide buttons */
  .actions {
    margin-top: 1.25rem;
    display: flex;
    flex-direction: row;
    justify-content: center;
    align-items: center;
    gap: 1.5rem;
    padding: 1.25rem 2.5rem 1.75rem;
    background-color: #f9fafb;
  }

  .desactivate,
  .cancel {
    flex: 1;
    max-width: 400px;
    height: 3.2rem; /* ✅ consistent height */
    display: flex; /* ✅ center text */
    justify-content: center;
    align-items: center;
    padding: 0 1.5rem;
    font-size: 1.1rem;
    font-weight: 600;
    border-radius: 0.5rem;
    cursor: pointer;
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
`;

export default Card;
