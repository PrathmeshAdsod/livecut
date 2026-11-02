import { Nav, Toasts } from "@/components/common";
import { Library } from "@/components/library";
export default function LibraryPage() {
  return (
    <>
      <Nav />
      <main className="public-content">
        <div className="page-heading">
          <div>
            <div className="eyebrow">THE CREATIVE LIBRARY</div>
            <h1>One moment. Fifty different stories.</h1>
            <p>Find your format. Make it yours. No editing skills required.</p>
          </div>
          <span className="tag">50 FORMATS · 6 RENDERERS</span>
        </div>
        <Library />
      </main>
      <Toasts />
    </>
  );
}
