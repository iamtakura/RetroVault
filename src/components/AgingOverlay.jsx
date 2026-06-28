import React from 'react';

export default function AgingOverlay() {
  return (
    <>
      {/* SVG Turbulence & Displacement Filter */}
      <svg
        style={{
          position: 'absolute',
          width: 0,
          height: 0,
          pointerEvents: 'none',
        }}
      >
        <defs>
          <filter id="retro-grain">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.75"
              numOctaves="3"
              stitchTiles="stitch"
              result="noise"
            />
            <feColorMatrix
              type="matrix"
              values="0 0 0 0 0   0 0 0 0 0   0 0 0 0 0  0 0 0 0.15 0"
              result="coloredNoise"
            />
            {/* Very subtle displacement mapping to warp the scanlines and text slightly */}
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale="1.5"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>

      {/* Retro Layers Container */}
      <div className="retro-aging-container">
        {/* Animated Grain Layer */}
        <div className="retro-grain" />

        {/* Scanlines Layer */}
        <div className="retro-scanlines" />

        {/* Vignette Layer (Lens shadow) */}
        <div className="retro-vignette" />

        {/* Chromatic Aberration Layer (Red/Blue edge shifts) */}
        <div className="retro-aberration" />
      </div>

      {/* Scoped CSS styling for Retro Aging Overlay */}
      <style>{`
        .retro-aging-container {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          z-index: 9999;
          pointer-events: none;
          overflow: hidden;
        }

        /* Animated Grain */
        .retro-grain {
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: transparent;
          filter: url(#retro-grain);
          opacity: 0.6; /* 0.6 on grain as requested */
          pointer-events: none;
          animation: grain-jump 0.3s steps(6) infinite;
        }

        @keyframes grain-jump {
          0% { transform: translate(0, 0); }
          20% { transform: translate(-2%, 4%); }
          40% { transform: translate(3%, -2%); }
          60% { transform: translate(-4%, -3%); }
          80% { transform: translate(2%, 1%); }
          100% { transform: translate(-1%, 2%); }
        }

        /* Scanlines */
        .retro-scanlines {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: repeating-linear-gradient(
            to bottom,
            rgba(0, 0, 0, 0) 0px,
            rgba(0, 0, 0, 0) 2px,
            rgba(0, 0, 0, 0.25) 2px,
            rgba(0, 0, 0, 0.25) 4px
          );
          opacity: 0.4; /* 0.4 on scanlines as requested */
          pointer-events: none;
        }

        /* Radial Vignette */
        .retro-vignette {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: radial-gradient(
            circle,
            transparent 45%,
            rgba(0, 0, 0, 0.65) 100%
          );
          pointer-events: none;
        }

        /* Chromatic Aberration via Edge Bleeds */
        .retro-aberration {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
        }

        .retro-aberration::before,
        .retro-aberration::after {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          mix-blend-mode: screen;
        }

        /* Warm Channel Shift — subtle, avoids purple */
        .retro-aberration::before {
          background: radial-gradient(
            circle,
            transparent 65%,
            rgba(180, 140, 100, 0.04) 100%
          );
          transform: translate(-1px, 0.5px);
        }

        /* Cool Channel Shift — subtle, avoids purple */
        .retro-aberration::after {
          background: radial-gradient(
            circle,
            transparent 65%,
            rgba(100, 130, 150, 0.04) 100%
          );
          transform: translate(1px, -0.5px);
        }
      `}</style>
    </>
  );
}
