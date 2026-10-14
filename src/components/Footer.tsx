import { Scissors } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t bg-slate-50">
      <div className="container mx-auto px-4 py-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2 font-semibold text-slate-800">
          <Scissors className="h-5 w-5 text-primary" />
          <span>BarberShop System</span>
        </div>

        <p>© 2026 BarberShop.</p>
      </div>
    </footer>
  );
}
