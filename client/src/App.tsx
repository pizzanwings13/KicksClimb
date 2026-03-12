export default function App() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0a0a0a",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Courier New', Courier, monospace",
        color: "#fff",
        textAlign: "center",
        padding: "20px",
      }}
    >
      <div
        style={{
          border: "3px solid #fff",
          padding: "48px 64px",
          maxWidth: "560px",
          width: "100%",
          background: "#111",
          boxShadow: "8px 8px 0px #fff",
        }}
      >
        <div
          style={{
            fontSize: "12px",
            letterSpacing: "6px",
            textTransform: "uppercase",
            color: "#aaa",
            marginBottom: "24px",
          }}
        >
          Token Rush
        </div>

        <h1
          style={{
            fontSize: "clamp(28px, 6vw, 48px)",
            fontWeight: "900",
            lineHeight: "1.1",
            margin: "0 0 24px 0",
            textTransform: "uppercase",
            letterSpacing: "2px",
          }}
        >
          Rebuilding
        </h1>

        <div
          style={{
            width: "60px",
            height: "3px",
            background: "#fff",
            margin: "0 auto 24px",
          }}
        />

        <p
          style={{
            fontSize: "18px",
            color: "#ccc",
            margin: "0",
            letterSpacing: "1px",
            textTransform: "uppercase",
          }}
        >
          New Site Coming Soon
        </p>
      </div>
    </div>
  );
}
