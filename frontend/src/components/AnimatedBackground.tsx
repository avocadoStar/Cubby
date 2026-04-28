export function AnimatedBackground() {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden">
      <div
        className="absolute rounded-full opacity-35"
        style={{
          width: 600, height: 600,
          background: 'radial-gradient(circle, #4f46e5, transparent 70%)',
          top: '-15%', left: '-10%',
          filter: 'blur(120px)',
          animation: 'orbFloat 20s ease-in-out infinite',
        }}
      />
      <div
        className="absolute rounded-full opacity-35"
        style={{
          width: 500, height: 500,
          background: 'radial-gradient(circle, #7c3aed, transparent 70%)',
          bottom: '-10%', right: '-5%',
          filter: 'blur(120px)',
          animation: 'orbFloat 20s ease-in-out infinite',
          animationDelay: '-7s',
        }}
      />
      <div
        className="absolute rounded-full opacity-20"
        style={{
          width: 400, height: 400,
          background: 'radial-gradient(circle, #2563eb, transparent 70%)',
          top: '40%', left: '30%',
          filter: 'blur(120px)',
          animation: 'orbFloat 20s ease-in-out infinite',
          animationDelay: '-14s',
        }}
      />
    </div>
  )
}
