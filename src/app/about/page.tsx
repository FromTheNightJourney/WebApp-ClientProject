export default function AboutPage() {
  return (
    <div>
      <div className="container mx-auto px-4 pt-6 pb-12">

        {/* Hero Section */}
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold tracking-tight text-zinc-900 sm:text-5xl">
            Project Details
          </h1>
        </header>

        {/* Constraining wrapper for content sections */}
        <div className="max-w-3xl mx-auto">
          <div className="space-y-12">
            {/* Demonstration Video Section */}
            <section className="bg-zinc-50 rounded-xl p-8 shadow-sm border border-zinc-200 ">
              <h2 className="text-2xl font-bold text-zinc-900 mb-4 text-center">Demonstration Video</h2>
              <div className="aspect-video relative overflow-hidden rounded-lg border-2 border-zinc-300">
                <iframe
                  className="absolute top-0 left-0 w-full h-full"
                  src="https://www.youtube.com/embed/a8dgNdJVluc"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title="LTU Moodle Builder Demonstration"
                ></iframe>
              </div>
            </section>

            {/* About the Developer */}
            <section className="bg-zinc-50 rounded-xl p-8 shadow-sm border border-zinc-200 ">
              <h2 className="text-2xl font-bold text-zinc-900 mb-4">About the Project</h2>
              <p className="text-zinc-700 leading-relaxed">
                I'm Andrew Tanuwijaya, a Latrobe/Binus International University student currently undergoing the CSE3CWA/CSE5006 course, Cloud Web-Application Design.
                The primary function of this web app is to generate HTML and JavaScript code to be able to deploy them on the MOODLE LMS platform.
              </p>
            </section>

            {/* Technology Stack Section */}
            <section className="bg-zinc-50 rounded-xl p-8 shadow-sm border border-zinc-200 ">
              <h2 className="text-2xl font-bold text-zinc-900 mb-6 text-center">Primarily Used Technology</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 text-center">
                <div className="p-4">
                  <h3 className="text-xl font-semibold text-zinc-800">Next.js</h3>
                  <p className="text-zinc-600 mt-2">The React framework for building fast and scalable web applications.</p>
                </div>
                <div className="p-4">
                  <h3 className="text-xl font-semibold text-zinc-800 ">React</h3>
                  <p className="text-zinc-600 mt-2">A JavaScript library for building user interfaces with a component-based architecture.</p>
                </div>
                <div className="p-4">
                  <h3 className="text-xl font-semibold text-zinc-800">Tailwind CSS</h3>
                  <p className="text-zinc-600 mt-2">A utility-first CSS framework for rapid UI development and clean styling.</p>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

