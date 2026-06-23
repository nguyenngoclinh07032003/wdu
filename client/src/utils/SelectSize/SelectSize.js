import Modal from 'react-bootstrap/Modal';

import imgSelectSize from '../../assests/imgs/Bang-size-KID.webp';

import selectSizeName from '../../assests/imgs/chon-size-3.webp';
import selectSizeName1 from '../../assests/imgs/chon-size-2.webp';

function SelectSize({ dataProduct, show, setShow }) {
    const handleClose = () => setShow(false);

    return (
        <>
            <Modal show={show} onHide={handleClose}>
                {dataProduct.map((item, index) => (
                    <div key={index}>
                        {item.type === 1 ? (
                            <div style={{ width: '500px' }}>
                                <img style={{ width: '100%' }} src={selectSizeName} alt="Type 1" />
                                <img style={{ width: '100%' }} src={selectSizeName1} alt="Type 1" />
                            </div>
                        ) : item.type === 2 ? (
                            <div style={{ width: '500px' }}>
                                <img style={{ width: '100%' }} src={selectSizeName} alt="Type 1" />
                                <img style={{ width: '100%' }} src={selectSizeName1} alt="Type 1" />
                            </div>
                        ) : (
                            <div style={{ width: '500px' }}>
                                <img style={{ width: '100%' }} src={imgSelectSize} alt="Default type" />
                            </div>
                        )}
                    </div>
                ))}
            </Modal>
        </>
    );
}

export default SelectSize;
