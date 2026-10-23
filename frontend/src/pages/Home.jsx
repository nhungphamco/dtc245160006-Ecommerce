import { useEffect, useState } from "react";
import { getProducts } from "../services/api";
import { useCart } from "../context/useCart";
import ProductCard from "../components/ProductCard";
import "./Home.css";

function Home() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const { addToCart } = useCart();

    useEffect(() => {
        let active = true;

        async function loadProducts() {
            try {
                const data = await getProducts();

                if (active) {
                    setProducts(data);
                }
            } catch (err) {
                if (active) {
                    setError(err.message);
                }
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        }

        loadProducts();

        return () => {
            active = false;
        };
    }, []);

    return (
        <main id="main-content" className="home">
            <section className="hero">
                <div className="hero__content">
                    <p className="hero__label">
                        THE EVERYDAY UPGRADE
                    </p>

                    <h1>Website bán hàng công nghệ của PhamThiNhung.</h1>

                    <p className="hero__description">
                        Khám phá bàn phím, chuột gaming
                        và phụ kiện công nghệ chất lượng.
                    </p>

                    <a href="#products" className="hero__button">
                        Khám phá sản phẩm
                    </a>
                </div>
                <div className="hero__art">
                    <span className="hero__orbit" aria-hidden="true"></span>
                    <img
                        className="hero__product-image"
                        src="https://cdn2.cellphones.com.vn/800x/media/catalog/product/g/r/group_2112_1.png"
                        alt="Tai nghe Sennheiser MOMENTUM True Wireless 5"
                        fetchPriority="high"
                    />
                    <div className="hero__art-label">
                        <span>YOUR SPACE. YOUR RULES.</span>
                        <strong>Chạm vào cảm hứng.</strong>
                    </div>
                    <span className="hero__edition">SETUP ESSENTIALS / 01</span>
                </div>
            </section>

            <section id="products" className="products">
                <div className="products__heading">
                    <div>
                        <p className="section-label">BỘ SƯU TẬP</p>
                        <h2>Chọn gear. Tạo chất riêng.</h2>
                    </div>

                    <span>{products.length} sản phẩm</span>
                </div>

                {loading && <div role="status"><p>Đang tải bộ sưu tập…</p><div className="skeleton-grid" aria-hidden="true">{[1,2,3,4].map(i=><div className="skeleton-card" key={i}/>)}</div></div>}

                {error && (
                    <p role="alert" className="error-message">
                        {error}
                    </p>
                )}

{!loading && !error && products.length === 0 && <div className="empty-state"><h3>Bộ sưu tập đang được cập nhật</h3><p>Hãy ghé lại để khám phá các thiết bị mới.</p></div>}
                {!loading && !error && (
                    <div className="products__grid">
                        {products.map((product) => (
                            <ProductCard
                                key={product.id}
                                product={product}
                                onAddToCart={addToCart}
                            />
                        ))}
                    </div>
                )}
            </section>
        </main>
    );
}

export default Home;
