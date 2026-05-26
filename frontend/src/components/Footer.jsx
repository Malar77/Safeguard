import { Link } from "react-router-dom";
import { FiShield, FiPhone, FiMail } from "react-icons/fi";

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300 mt-12">
      <div className="max-w-7xl mx-auto px-4 py-10 grid grid-cols-1 md:grid-cols-4 gap-8">
        <div>
          <div className="flex items-center gap-2 text-white font-bold text-lg mb-3">
            <FiShield className="text-primary-400" /> SafeGuard
          </div>
          <p className="text-sm text-gray-400">Empowering women and protecting children through technology, awareness, and community support.</p>
        </div>

        <div>
          <h3 className="text-white font-semibold mb-3">Quick Links</h3>
          <ul className="space-y-2 text-sm">
            <li><Link to="/helplines"       className="hover:text-primary-400 transition">Helplines</Link></li>
            <li><Link to="/legal-resources" className="hover:text-primary-400 transition">Legal Rights</Link></li>
            <li><Link to="/counseling"      className="hover:text-primary-400 transition">Counseling</Link></li>
            <li><Link to="/child-safety"    className="hover:text-primary-400 transition">Child Safety</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="text-white font-semibold mb-3">Emergency Numbers</h3>
          <ul className="space-y-2 text-sm">
            <li><a href="tel:112"  className="hover:text-primary-400">112  — National Emergency</a></li>
            <li><a href="tel:1091" className="hover:text-primary-400">1091 — Women Helpline</a></li>
            <li><a href="tel:1098" className="hover:text-primary-400">1098 — Child Helpline</a></li>
            <li><a href="tel:100"  className="hover:text-primary-400">100  — Police</a></li>
            <li><a href="tel:181"  className="hover:text-primary-400">181  — Domestic Violence</a></li>
          </ul>
        </div>

        <div>
          <h3 className="text-white font-semibold mb-3">Contact</h3>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2"><FiPhone /> <a href="tel:1091" className="hover:text-primary-400">1091 (24/7 Helpline)</a></li>
            <li className="flex items-center gap-2"><FiMail /> <a href="mailto:support@safeguard.in" className="hover:text-primary-400">support@safeguard.in</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-gray-800 text-center text-xs text-gray-500 py-4">
        © {new Date().getFullYear()} SafeGuard. Built with care for a safer India. | This is a support platform — for immediate danger call 112.
      </div>
    </footer>
  );
}
