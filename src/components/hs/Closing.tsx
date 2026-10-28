import { Link } from "@tanstack/react-router";
import HalftoneWordmarkFooter from "@/components/ui/halftone-wordmark-footer";

export function Footer() {
  return (
    <footer className="rounded-t-card bg-inverse text-inverse-foreground">
      <div className="container-x pb-8 pt-16">
        <div className="grid gap-10 md:grid-cols-[1fr_auto_auto] md:gap-20">
          <nav aria-label="Product">
            <h3 className="mb-3 text-[14px] font-semibold">Product</h3>
            <ul className="space-y-2 text-inverse-muted">
              <li><a className="transition-colors hover:text-inverse-foreground" href="/#how">How it works</a></li>
              <li><a className="transition-colors hover:text-inverse-foreground" href="/#faq">FAQ</a></li>
            </ul>
          </nav>
          <nav aria-label="Company">
            <h3 className="mb-3 text-[14px] font-semibold">Company</h3>
            <ul className="space-y-2 text-inverse-muted">
              <li><Link to="/about" className="transition-colors hover:text-inverse-foreground">About us</Link></li>
              <li><Link to="/contact" className="transition-colors hover:text-inverse-foreground">Contact us</Link></li>
              <li><Link to="/privacy" className="transition-colors hover:text-inverse-foreground">Privacy policy</Link></li>
            </ul>
          </nav>
        </div>
        <HalftoneWordmarkFooter
          as="div"
          hideHeader
          hideRule
          wordmark="hiresense"
          height="280px"
          crop={0.16}
          dotGap={6}
          radius={90}
          grain={0.4}
          palette={{
            background: "#f5f5f5",
            ink: "#0a0a0a",
            warm: "#0066ff",
          }}
          className="mt-12 w-full select-none"
        />
        <div className="mt-8 flex justify-between text-[14px] text-inverse-muted">
          <span>hiresense.online</span>
          <span>© 2026 HireSense</span>
        </div>
      </div>
    </footer>
  );
}
