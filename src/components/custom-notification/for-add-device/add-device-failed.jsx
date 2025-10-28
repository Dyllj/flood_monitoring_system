import React, { useEffect, useRef, useState } from "react";
import styled, { keyframes, css } from "styled-components";

const slideIn = keyframes`
  from { transform: translateY(-8px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
`;
const fadeOut = keyframes`
  from { opacity: 1; transform: translateY(0); }
  to { opacity: 0; transform: translateY(-8px); }
`;
const progressAnim = () => keyframes`
  from { width: 100%; }
  to { width: 0%; }
`;

const AddDeviceFailed = ({
  onClose,
  message = "Device addition failed",
  subText = "Something went wrong",
  duration = 4500,
}) => {
  const [exiting, setExiting] = useState(false);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef(null);
  const startRef = useRef(0);
  const remainingRef = useRef(duration);

  useEffect(() => {
    startRef.current = Date.now();
    timerRef.current = setTimeout(() => startExit(), remainingRef.current);
    return () => clearTimeout(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startExit = () => {
    setExiting(true);
    setTimeout(() => {
      if (onClose) onClose();
    }, 220);
  };

  const handleMouseEnter = () => {
    setPaused(true);
    clearTimeout(timerRef.current);
    const elapsed = Date.now() - startRef.current;
    remainingRef.current = Math.max(0, remainingRef.current - elapsed);
  };

  const handleMouseLeave = () => {
    setPaused(false);
    startRef.current = Date.now();
    timerRef.current = setTimeout(() => startExit(), remainingRef.current);
  };

  return (
    <StyledWrapper
      role="alert"
      aria-live="assertive"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      $duration={duration}
      $paused={paused}
      $exiting={exiting}
    >
      <div className="card">
        <svg className="wave" viewBox="0 0 1440 320" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
          <path d="M0,256L11.4,240C22.9,224,46,192,69,192C91.4,192,114,224,137,234.7C160,245,183,235,206,213.3C228.6,192,251,160,274,149.3C297.1,139,320,149,343,181.3C365.7,213,389,267,411,282.7C434.3,299,457,277,480,250.7C502.9,224,526,192,549,181.3C571.4,171,594,181,617,208C640,235,663,277,686,256C708.6,235,731,149,754,122.7C777.1,96,800,128,823,165.3C845.7,203,869,245,891,224C914.3,203,937,117,960,112C982.9,107,1006,181,1029,197.3C1051.4,213,1074,171,1097,144C1120,117,1143,107,1166,133.3C1188.6,160,1211,224,1234,218.7C1257.1,213,1280,139,1303,133.3C1325.7,128,1349,192,1371,192C1394.3,192,1417,128,1429,96L1440,64L1440,320L0,320Z" fill="#fc0c0c" fillOpacity="0.12" />
        </svg>

        <div className="icon-container" aria-hidden="true">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" strokeWidth={0} fill="currentColor" className="icon">
            <path d="M256 48a208 208 0 1 1 0 416 208 208 0 1 1 0-416zm0 464A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM175 175c-9.4 9.4-9.4 24.6 0 33.9l47 47-47 47c-9.4 9.4-9.4 24.6 0 33.9s24.6 9.4 33.9 0l47-47 47 47c9.4 9.4 24.6 9.4 33.9 0s9.4-24.6 0-33.9l-47-47 47-47c9.4-9.4 9.4-24.6 0-33.9s-24.6-9.4-33.9 0l-47 47-47-47c-9.4-9.4-24.6-9.4-33.9 0z" />
          </svg>
        </div>

        <div className="message-text-container">
          <p className="message-text">{message}</p>
          <p className="sub-text">{subText}</p>
        </div>

        <button className="close-btn" onClick={() => startExit()} aria-label="Close notification">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 15 15" width="14" height="14" fill="currentColor" aria-hidden="true">
            <path d="M11.7816 4.03157C12.0062 3.80702 12.0062 3.44295 11.7816 3.2184C11.5571 2.99385 11.193 2.99385 10.9685 3.2184L7.50005 6.68682L4.03164 3.2184C3.80708 2.99385 3.44301 2.99385 3.21846 3.2184C2.99391 3.44295 2.99391 3.80702 3.21846 4.03157L6.68688 7.49999L3.21846 10.9684C2.99391 11.193 2.99391 11.557 3.21846 11.7816C3.44301 12.0061 3.80708 12.0061 4.03164 11.7816L7.50005 8.31316L10.9685 11.7816C11.193 12.0061 11.5571 12.0061 11.7816 11.7816C12.0062 11.557 12.0062 11.193 11.7816 10.9684L8.31322 7.49999L11.7816 4.03157Z" clipRule="evenodd" fillRule="evenodd" />
          </svg>
        </button>

        <div className="progress" aria-hidden="true" />
      </div>
    </StyledWrapper>
  );
};

const StyledWrapper = styled.div`
  --danger: #d10d0d;
  --muted: #555;
  display: inline-block;

  .card {
    min-width: 20rem;
    max-width: 22rem;
    padding: 0.6rem 0.9rem;
    background: #fff;
    border-radius: 0.5rem;
    box-shadow: 0 10px 24px rgba(16,24,40,0.08);
    position: relative;
    overflow: hidden;
    display: flex;
    gap: 0.9rem;
    align-items: center;
    box-sizing: border-box;
    animation: ${slideIn} 220ms ease-out both;
    ${props =>
      props.$exiting &&
      css`
        animation: ${fadeOut} 220ms ease-in both;
      `}
  }

  .wave { position: absolute; right: -28%; top: -12%; width: 160%; fill: rgba(252,12,12,0.10); transform: rotate(6deg); pointer-events: none; }

  .icon-container { flex: 0 0 2.2rem; height: 2.2rem; display:flex;align-items:center;justify-content:center;border-radius:999px;background:rgba(252,12,12,0.12); }
  .icon { width:1.05rem;height:1.05rem;color:var(--danger); }

  .message-text-container { flex:1 1 auto; min-width:0; display:flex;flex-direction:column; justify-content:center; align-items:flex-start; }
  .message-text, .sub-text { margin:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .message-text { color:var(--danger); font-weight:700; font-size:1.03rem; }
  .sub-text { color:var(--muted); font-size:0.9rem; opacity:0.95; }

  .close-btn { background:transparent;border:none;padding:0.3rem;border-radius:6px;color:var(--muted);cursor:pointer; }
  .close-btn:focus { outline:none; box-shadow: 0 0 0 3px rgba(209,13,13,0.12); }
  .close-btn:hover { color:#333; }

  .progress {
    position: absolute;
    left: 0;
    bottom: 0;
    height: 4px;
    background: linear-gradient(90deg, var(--danger), #ff8b8b);
    width: 100%;
    transform-origin: left;
    animation: ${props => progressAnim(props.$duration)} ${props => props.$duration}ms linear forwards;
    animation-play-state: ${props => (props.$paused ? "paused" : "running")};
  }

  @media (prefers-reduced-motion: reduce) {
    .card { animation: none !important; }
    .progress { animation: none !important; width: 0; opacity: 0.6; }
  }
`;
export default AddDeviceFailed;
