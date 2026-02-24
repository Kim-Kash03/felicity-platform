import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/felicity.png';
import { FiLogOut, FiUser, FiCalendar, FiUsers, FiHome, FiPlusCircle, FiShield, FiKey, FiBell } from 'react-icons/fi';

const Navbar = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const participantLinks = [
        { to: '/dashboard', label: 'Dashboard', icon: <FiHome /> },
        { to: '/events', label: 'Browse Events', icon: <FiCalendar /> },
        { to: '/clubs', label: 'Clubs', icon: <FiUsers /> },
        { to: '/profile', label: 'Profile', icon: <FiUser /> },
    ];

    const organizerLinks = [
        { to: '/organizer/dashboard', label: 'Dashboard', icon: <FiHome /> },
        { to: '/organizer/announcements', label: 'Announcements', icon: <FiBell /> },
        { to: '/organizer/create', label: 'Create Event', icon: <FiPlusCircle /> },
        { to: '/organizer/profile', label: 'Profile', icon: <FiUser /> },
    ];

    const adminLinks = [
        { to: '/admin/dashboard', label: 'Dashboard', icon: <FiShield /> },
        { to: '/admin/organizers', label: 'Manage Clubs', icon: <FiUsers /> },
        { to: '/admin/resets', label: 'Password Resets', icon: <FiKey /> },
    ];

    const links = user?.role === 'participant' ? participantLinks
        : user?.role === 'organizer' ? organizerLinks
            : user?.role === 'admin' ? adminLinks
                : [];

    const displayName = user?.firstName || user?.organizerName || 'Admin';
    const initials = displayName.slice(0, 1).toUpperCase();

    return (
        <nav className="navbar">
            <div className="container navbar-inner">
                <div className="navbar-brand" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }} onClick={() => navigate(user ? (user.role === 'participant' ? '/dashboard' : user.role === 'organizer' ? '/organizer/dashboard' : '/admin/dashboard') : '/')}>
                    <img src={logo} alt="Felicity Logo" style={{ height: '32px' }} />
                </div>

                <div className="navbar-links">
                    {links.map(link => (
                        <NavLink
                            key={link.to}
                            to={link.to}
                            className={({ isActive }) => `navbar-link ${isActive ? 'active' : ''}`}
                        >
                            {link.icon} {link.label}
                        </NavLink>
                    ))}

                    {user && (
                        <>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: '0.5rem', padding: '0 0.5rem', borderLeft: '1px solid var(--color-border)' }}>
                                <div className="avatar" style={{ width: 32, height: 32, fontSize: '0.8rem' }}>{initials}</div>
                                <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--color-text-muted)' }}>{displayName}</span>
                            </div>
                            <button className="btn btn-ghost btn-sm" onClick={handleLogout} style={{ marginLeft: '0.25rem' }}>
                                <FiLogOut /> Logout
                            </button>
                        </>
                    )}
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
