import React from 'react';
import styled from 'styled-components';

const AdminModifyFailed = ({ onClose, message }) => {
  return (
    <StyledWrapper>
      <div className="card">
        <div className="icon-container">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" strokeWidth={0} fill="currentColor" stroke="currentColor" className="icon">
            <path d="M256 48C141.12 48 48 141.12 48 256s93.12 208 208 208 208-93.12 208-208S370.88 48 256 48zm0 384c-97.05 0-176-78.95-176-176S158.95 80 256 80s176 78.95 176 176-78.95 176-176 176zm-32-240c0-8.84 7.16-16 16-16s16 7.16 16 16v80c0 8.84-7.16 16-16 16s-16-7.16-16-16v-80zm16 128c-13.25 0-24-10.75-24-24s10.75-24 24-24 24 10.75 24 24-10.75 24-24 24z"/>
          </svg>
        </div>
        <div className="message-text-container">
          <p className="message-text">Failed: {message}</p>
        </div>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 15 15" strokeWidth={0} fill="none" stroke="currentColor" className="cross-icon" onClick={onClose}>
          <path fill="currentColor" d="M11.7816 4.03157C12.0062 3.80702 12.0062 3.44295 11.7816 3.2184C11.5571 2.99385 11.193 2.99385 10.9685 3.2184L7.50005 6.68682L4.03164 3.2184C3.80708 2.99385 3.44301 2.99385 3.21846 3.2184C2.99391 3.44295 2.99391 3.80702 3.21846 4.03157L6.68688 7.49999L3.21846 10.9684C2.99391 11.193 2.99391 11.557 3.21846 11.7816C3.44301 12.0061 3.80708 12.0061 4.03164 11.7816L7.50005 8.31316L10.9685 11.7816C11.193 12.0061 11.5571 12.0061 11.7816 11.7816C12.0062 11.557 12.0062 11.193 11.7816 10.9684L8.31322 7.49999L11.7816 4.03157Z" clipRule="evenodd" fillRule="evenodd" />
        </svg>
      </div>
    </StyledWrapper>
  );
};

const StyledWrapper = styled.div`
  position: fixed;
  top: 1rem;
  right: 1rem;
  z-index: 9999;

  display: flex;
  flex-direction: column;
  gap: 0.5rem;

  .card {
    width: 450px;
    height: 80px;
    border-radius: 8px;
    padding: 10px 15px;
    background-color: #ffe4e4;
    box-shadow: rgba(149, 157, 165, 0.2) 0px 8px 24px;
    position: relative;
    display: flex;
    align-items: center;
    gap: 15px;
    opacity: 0;
    transform: translateY(-10px);
    animation: fadeIn 0.4s ease forwards;
  }

  @keyframes fadeIn {
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .icon-container {
    width: 35px;
    height: 35px;
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: #ff000048;
    border-radius: 50%;
  }

  .icon {
    width: 17px;
    height: 17px;
    color: #d10000;
  }

  .message-text-container {
    display: flex;
    flex-direction: column;
    justify-content: center;
    flex-grow: 1;
  }

  .message-text {
    margin: 0;
    font-size: 17px;
    font-weight: 700;
    color: #d10000;
  }

  .cross-icon {
    width: 18px;
    height: 18px;
    color: #555;
    cursor: pointer;
  }
`;

export default AdminModifyFailed;
