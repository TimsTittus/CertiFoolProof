import Link from "next/link";

export default function Home() {
  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-8 row-start-2 items-center text-center max-w-4xl">
        <h1 className="text-4xl sm:text-6xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          CertiFoolProof
        </h1>

        <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-300 leading-relaxed">
          A digital certificate verification platform that provides secure, efficient, and reliable
          authentication of academic and organizational certificates. CertiFoolProof streamlines
          the verification process while maintaining the highest standards of security and authenticity.
        </p>

        <div className="flex gap-4 items-center flex-col sm:flex-row mt-8">
          <Link
            className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white gap-2 text-sm sm:text-base h-10 sm:h-12 px-6 sm:px-8"
            href="/login"
          >
            Get Started
          </Link>
          <Link
            className="rounded-full border border-solid border-blue-600 transition-colors flex items-center justify-center hover:bg-blue-50 dark:hover:bg-blue-900/20 text-sm sm:text-base h-10 sm:h-12 px-6 sm:px-8"
            href="/#features"
          >
            Learn More
          </Link>
        </div>
      </main>

      <footer className="row-start-3 flex gap-6 flex-wrap items-center justify-center text-sm text-gray-600 dark:text-gray-400">
        <Link
          className="hover:text-blue-600 transition-colors"
          href="/#about"
        >
          About
        </Link>
        <Link
          className="hover:text-blue-600 transition-colors"
          href="/#contact"
        >
          Contact
        </Link>
        <Link
          className="hover:text-blue-600 transition-colors"
          href="/#docs"
        >
          Documentation
        </Link>
      </footer>
    </div>
  );
}
