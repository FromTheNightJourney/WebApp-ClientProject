export default function AboutPage() {
  return (
    <div>
      <div className="container mx-auto px-4 pt-6 pb-12">

        {/* hero section */}
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold tracking-tight text-one sm:text-5xl">
            Project Details
          </h1>
        </header>

        {/* content section wrapper*/}
        <div className="max-w-3xl mx-auto">
          <div className="space-y-12">
            {/* Demonstration Video Section */}
            <section className="bg-eight  rounded-xl p-8 shadow-sm border border-seven ">
              <h2 className="text-2xl font-bold text-one  mb-4 text-center">Demonstration Video</h2>
              <div className="aspect-video relative overflow-hidden rounded-lg border-2 border-six ">
                <iframe
                  className="absolute top-0 left-0 w-full h-full"
                  src="https://www.youtube.com/embed/O-CjYoJ3pDI"
                  frameBorder=""
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title="LTU Moodle Builder Demonstration"
                ></iframe>
              </div>
            </section>

            {/* about me */}
            <section className="bg-eight  rounded-xl p-8 shadow-sm border border-seven ">
              <h2 className="text-2xl font-bold text-one  mb-4">About the Project</h2>
              <p className="text-three  leading-relaxed">
                I am Andrew Tanuwijaya, a Latrobe/Binus International University student currently undergoing the CSE3CWA/CSE5006 course, Cloud Web-Application Design.
                The primary function of this web app is to generate HTML and JavaScript code to be able to deploy them on the MOODLE LMS platform.
              </p>
            </section>

          </div>
        </div>
      </div>
    </div>
  );
}

