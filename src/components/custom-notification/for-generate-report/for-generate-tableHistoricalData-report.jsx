import React from 'react';
import styled from 'styled-components';

// ✅ Accept sensorName as a prop
const GenerateReportTableHistoricalData = ({ onClose }) => {
  return (
    <StyledWrapper>
      <div className="card">
        <div className="icon-container">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" strokeWidth={0} fill="currentColor" className="icon">
            <path d="M256 48a208 208 0 1 1 0 416 208 208 0 1 1 0-416zm0 464A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM369 209c9.4-9.4 9.4-24.6 0-33.9s-24.6-9.4-33.9 0l-111 111-47-47c-9.4-9.4-24.6-9.4-33.9 0s-9.4 24.6 0 33.9l64 64c9.4 9.4 24.6 9.4 33.9 0L369 209z" />
          </svg>
        </div>
        <div className="message-text-container">
          <p className="message-text">Table report generated!</p>
          <p className="sub-text">Historical data table exported successfully</p>
        </div>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 15 15" className="cross-icon" onClick={onClose}>
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
    box-sizing: border-box;
    padding: 10px 15px;
    background-color: #ffffff;
    box-shadow: rgba(149, 157, 165, 0.2) 0px 8px 24px;
    position: relative;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: space-around;
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

  .wave {
    position: absolute;
    transform: rotate(90deg);
    left: -31px;
    top: 32px;
    width: 80px;
    fill: #04e4003a;
  }

  .icon-container {
    width: 35px;
    height: 35px;
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: #04e40048;
    border-radius: 50%;
    margin-left: 8px;
  }

  .icon {
    width: 17px;
    height: 17px;
    color: #269b24;
  }

  .message-text-container {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: flex-start;
    flex-grow: 1;
  }

  .message-text,
  .sub-text {
    margin: 0;
    cursor: default;
  }

  .message-text {
    color: #269b24;
    font-size: 17px;
    font-weight: 700;
  }

  .sub-text {
    font-size: 14px;
    color: #555;
  }

  .cross-icon {
    width: 18px;
    height: 18px;
    color: #555;
    cursor: pointer;
  }
`;

export default GenerateReportTableHistoricalData;
