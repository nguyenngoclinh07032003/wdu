import App from '../App';
import Admin from '../Pages/Admin';
import Cart from '../Pages/Cart';
import Category from '../Pages/Category';
import DetailProducts from '../Pages/DetailProducts';
import InfoUser from '../Pages/InfoUser';
import LoginUser from '../Pages/Login';
import PaymentSuccess from '../Pages/PaymentSuccess';
import Payments from '../Pages/Payments';
import RegisterUser from '../Pages/RegisterUser';
import ForgotPassword from '../Pages/ForgotPassword';
import VerifyOtp from '../Components/VerifyOtp';
import About from '../Pages/About';
import Contact from '../Pages/Contact';
import Blog from '../Pages/Blog';
import DetailBlog from '../Pages/DetailBlog';
import AdminBlog from '../Components/ManageBlog';
import CreateBlog from '../Pages/Admin/ComponentsAdmin/CreateBlog';
import AddressBook from '../Pages/AddressBook/AddressBook';
import CustomerDetail from '../Components/CustomerDetail';
import VoucherPage from '../Pages/VoucherPage';
import ShipperDashboard from '../Pages/Shipper/ShipperDashboard';
import Staff from '../Pages/Staff/Staff';
import Doctor from '../Pages/Doctor/Doctor';
import AskDoctor from '../Pages/AskDoctor/AskDoctor';
import AskStaff from '../Pages/AskStaff/AskStaff';

export const publicRoute = [
    { path: '/', element: <App /> },
    { path: '/product/:id/:slug', element: <DetailProducts /> },
    { path: '/category', element: <Category /> },
    { path: '/category/:slug', element: <Category /> },

    { path: '/voucher', element: <VoucherPage /> },

    { path: '/blog', element: <Blog /> },
    { path: '/blog/:slug', element: <DetailBlog /> },

    { path: '/about', element: <About /> },
    { path: '/contact', element: <Contact /> },
    { path: '/cart', element: <Cart /> },
    { path: '/payments', element: <Payments /> },
    { path: '/paymentsuccess', element: <PaymentSuccess /> },

    { path: '/login', element: <LoginUser /> },
    { path: '/register', element: <RegisterUser /> },
    { path: '/verify-otp', element: <VerifyOtp /> },
    { path: '/forgotpassword', element: <ForgotPassword /> },
    { path: '/info', element: <InfoUser /> },

    { path: '/address-book', element: <AddressBook /> },

    { path: '/shipper/dashboard', element: <ShipperDashboard /> },

    { path: '/staff', element: <Staff /> },

    { path: '/doctor', element: <Doctor /> },

    { path: '/hoi-bac-si', element: <AskDoctor /> },

    { path: '/hoi-nhan-vien', element: <AskStaff /> },

    { path: '/admin', element: <Admin /> },
    // { path: '/admin/blog', element: <AdminBlog /> },
    // { path: '/admin/blog/create', element: <CreateBlog /> },
    { path: '/admin/customer/:id', element: <CustomerDetail /> },

    { path: '*', element: <App /> },
];

export const privateRoute = [
    { path: '/admin', element: <Admin /> },
    { path: '/admin/blog', element: <AdminBlog /> },
    { path: '/admin/blog/create', element: <CreateBlog /> },
];
