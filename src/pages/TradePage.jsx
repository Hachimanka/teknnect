import React, { useState } from 'react';
import './TradePage.css';
import LogoPlaceholder from '../assets/wakwak.png';
import PostItemModal from '../components/PostItemModal';

function TradePage() {
  return (
    <main className="trade-page">
      <h1 className="page-title">Trade Items</h1>
      <p className="page-subtitle">Looking to trade items with fellow Technologians? Browse listings below!</p>

      <button className="item-action-button" onClick={openPostModal} style={{ padding: '12px 24px', marginBottom: '2rem' }}>
        Post Trade Item
      </button>

      <section className="items-section">
        <h2 className="section-title">Available Items</h2>
        <div className="items-grid">
          {items.map((item, index) => (
            <div
              key={index}
              className="item-card"
              onClick={() => handleCardClick(item)}
            >
              <div className="item-badge">{item.status}</div>
              <div className="item-image">
                <img src={item.image} alt="placeholder" />
              </div>
              <div className="item-info">
                <div>
                  <h3 className="item-title">{item.title}</h3>
                  <p className="item-description">{item.description}</p>
                  <p className="item-date">Uploaded: {item.uploadDate}</p>
                </div>
                <div className="item-footer">
                  <div className="item-user">
                    <img src={item.profile} alt="profile" className="profile-pic" />
                    <span>{item.user}</span>
                  </div>
                  <button className="item-action-button">
                    Trade Offer
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* View Item Modal */}
      {selectedItem && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closeModal}>×</button>
            <h2>{selectedItem.title}</h2>
            <img src={selectedItem.image} alt="Enlarged item" className="modal-image" />
            <p>{selectedItem.description}</p>
            <p><strong>Date uploaded:</strong> {selectedItem.uploadDate}</p>
            <p><strong>Posted by:</strong> {selectedItem.user}</p>
            <button className="item-action-button" style={{ marginTop: '1rem' }}>
              Make Trade Offer
            </button>
          </div>
        </div>
      )}

      {/* Post Item Modal */}
      {showPostModal && <PostItemModal onClose={closePostModal} />}
    </main>
  );
}

export default TradePage;
