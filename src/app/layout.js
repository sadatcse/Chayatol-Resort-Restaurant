import "./globals.css";
import Providers from "./providers";

export const metadata = {
  title: "Login | Chayatol Resort & Restaurant",
  description: "Chayatol Resort & Restaurant Portal",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className="h-full antialiased font-sans"
      suppressHydrationWarning
    >
      <body suppressHydrationWarning className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
