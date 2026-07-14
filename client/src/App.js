import { useEffect, useState } from 'react';
import './App.css';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import FeatureGrid from './Components/FeatureGrid';
import Footer from './Components/Footer';
import Header from './Components/Header';
import ProductsTab from './Components/ProductsTab';
import Slider from './Components/Slider';
import request from './Config/api';
import Chatbot from './utils/Chatbot/Chatbot';
import Review from './Components/Review';
import Combo from './Components/Combo';

function MaintenancePage() {
    return (
        <div className="maintenance-page">
            <div className="maintenance-card">
                <div className="maintenance-badge">🚧 Website đang bảo trì</div>

                <h1>Hệ thống đang nâng cấp</h1>

                <p>Server hiện đang tạm dừng để nâng cấp hệ thống. Vui lòng quay lại sau ít phút.</p>

                <div className="maintenance-info">
                    <strong>Healthcare</strong>
                    <span>Cảm ơn quý khách đã kiên nhẫn chờ đợi ❤️</span>
                </div>
            </div>
        </div>
    );
}

function App() {
    const [dataProducts, setDataProducts] = useState([]);
    const [lengthCart, setLengthCart] = useState(0);
    const [serverDown, setServerDown] = useState(false);
    const [checkingServer, setCheckingServer] = useState(true);

    useEffect(() => {
        const checkServer = async () => {
            try {
                await request.get('/api/health');
                setServerDown(false);
            } catch (error) {
                setServerDown(true);
            } finally {
                setCheckingServer(false);
            }
        };

        checkServer();

        const timer = setInterval(checkServer, 10000);

        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        if (serverDown) return;

        request
            .get('/api/products')
            .then((res) => {
                setDataProducts(res.data);
            })
            .catch(() => {
                setServerDown(true);
            });
    }, [serverDown]);

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    if (checkingServer) {
        return null;
    }

    if (serverDown) {
        return <MaintenancePage />;
    }

    return (
        <div className="App">
            <ToastContainer />

            <header>
                <Header setLengthCart={setLengthCart} lengthCart={lengthCart} />
            </header>

            <main>
                <div>
                    <Chatbot />
                </div>

                <div>
                    <Slider />
                </div>

                <div>
                    <ProductsTab dataProducts={dataProducts} />
                </div>

                <div>
                    <Combo />
                </div>

                <div>
                    <Review />
                </div>

                <div>
                    <FeatureGrid />
                </div>
            </main>

            <footer>
                <Footer />
            </footer>
        </div>
    );
}

export default App;
