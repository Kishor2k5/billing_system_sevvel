import React, { useMemo, useState, useEffect } from 'react';
import reportIconUrl from '../image/icons/reports.svg';
import portalIconUrl from '../image/icons/home.svg';
import settingsIcon from '../image/icons/settings.svg';
import './Parties.css';
import PartyDrawer from '../components/PartyDrawer';
import CustomerHistoryDrawer from '../components/CustomerHistoryDrawer';
import API from '../api';

/* parties loaded from API */
const partiesList = [];

/* Summary cards values are computed from loaded parties (see inside component) */

export default function Parties() {
  const [drawerMode, setDrawerMode] = useState(null);
  const [selectedParty, setSelectedParty] = useState(null);
  const [openMenuIndex, setOpenMenuIndex] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState(''); // '' = All, 'Buyer', 'Supplier'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedParties, setSelectedParties] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [parties, setParties] = useState(partiesList);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState('');

  const filteredParties = useMemo(() => {
    let result = parties;
    if (categoryFilter) {
      result = result.filter((p) => p.category === categoryFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (p) =>
          (p.name && p.name.toLowerCase().includes(q)) ||
          (p.phone && p.phone.includes(q)) ||
          (p.gstNumber && p.gstNumber.toLowerCase().includes(q))
      );
    }
    return result;
  }, [parties, categoryFilter, searchQuery]);

  // Summary counts computed from loaded parties
  const totalParties = parties.length;
  const toCollectAmt = parties.reduce((sum, p) => {
    const bal = Number(p.balance || 0);
    return sum + (bal > 0 ? bal : 0);
  }, 0);
  const toPayAmt = parties.reduce((sum, p) => {
    const bal = Number(p.balance || 0);
    return sum + (bal < 0 ? Math.abs(bal) : 0);
  }, 0);

  const summaryCards = [
    { label: 'All Parties', value: String(totalParties), accent: 'lavender' },
    { label: 'To Collect', value: '₹ ' + toCollectAmt.toLocaleString('en-IN'), accent: 'green' },
    { label: 'To Pay', value: '₹ ' + toPayAmt.toLocaleString('en-IN'), accent: 'red' },
  ];

  useEffect(() => {
    let mounted = true;

    const loadParties = async () => {
      setIsLoading(true);
      setLoadError('');
      try {
        const { data } = await API.get('/parties');
        if (mounted) setParties(Array.isArray(data.parties) ? data.parties : []);
      } catch (err) {
        console.error('Failed to load parties', err);
        if (mounted) setLoadError('Unable to load parties');
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    loadParties();

    return () => {
      mounted = false;
    };
  }, []);

  const openDrawer = (mode, party = null) => {
    setSelectedParty(party);
    setDrawerMode(mode);
    setOpenMenuIndex(null);
  };

  const closeDrawer = () => setDrawerMode(null);

  const fetchParties = async () => {
    setIsLoading(true);
    setLoadError('');
    try {
      const { data } = await API.get('/parties');
      setParties(Array.isArray(data.parties) ? data.parties : []);
    } catch (err) {
      console.error('Failed to load parties', err);
      setLoadError('Unable to load parties');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePartyUpdated = () => {
    // Refresh the parties list after save
    fetchParties();
  };

  const toggleMenu = (index) => {
    setOpenMenuIndex(openMenuIndex === index ? null : index);
  };

  const handleEdit = (party) => {
    openDrawer('edit', party);
  };

  const handleDeleteClick = (party) => {
    setSelectedParty(party);
    setShowDeleteModal(true);
    setOpenMenuIndex(null);
  };

  const confirmDelete = async () => {
    if (!selectedParty) return;
    setIsDeleting(true);
    try {
      await API.delete(`/parties/${selectedParty.partyId}`);
      setShowDeleteModal(false);
      fetchParties();
    } catch (err) {
      alert(err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedParties.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedParties.length} customers?`)) return;

    setIsLoading(true);
    try {
      await Promise.all(selectedParties.map((id) => API.delete(`/parties/${id}`)));
      setSelectedParties([]);
      fetchParties();
    } catch (err) {
      alert('Failed to delete some customers');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedParties.length === filteredParties.length) {
      setSelectedParties([]);
    } else {
      setSelectedParties(filteredParties.map((p) => p.partyId));
    }
  };

  const toggleSelectParty = (id) => {
    setSelectedParties((prev) =>
      prev.includes(id) ? prev.filter((pId) => pId !== id) : [...prev, id]
    );
  };

  return (
    <div className="parties-page">
      {/* HEADER */}
      <header className="parties-header">
        <div className="page-title">
          <h1>Parties</h1>
          <p>Manage customers and view purchase history.</p>
        </div>

        <div className="header-actions">
          <button className="ghost-link">
            <img src={reportIconUrl} alt="Reports" className="icon-inline" />
            Reports
          </button>

          <button className="icon-btn">
            <img src={settingsIcon} alt="Settings" />
          </button>
        </div>
      </header>

      {/* SUMMARY */}
      <section className="summary-row">
        {summaryCards.map((card) => (
          <article key={card.label} className={`summary-card ${card.accent}`}>
            <p>{card.label}</p>
            <strong>{card.value}</strong>
          </article>
        ))}
      </section>

      {/* FILTERS */}
      <section className="filters-row">
        <div className="filters-left">
          <div className="search-box">
            <input
              type="search"
              placeholder="Search by name, mobile or GSTIN"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="">All Categories</option>
            <option value="Buyer">Buyer</option>
            <option value="Supplier">Supplier</option>
          </select>

          {selectedParties.length > 0 && (
            <button className="ghost danger-text" onClick={handleBulkDelete}>
              Delete Selected ({selectedParties.length})
            </button>
          )}
        </div>

        <button className="primary" onClick={() => openDrawer('create')}>
          Create Party
        </button>
      </section>

      {/* TABLE */}
      <section className="table-wrapper">
        <div className="table-container">
          <table className="party-table">
            <thead>
              <tr>
                <th>
                  <span className="checkbox-col">
                    <input
                      type="checkbox"
                      checked={
                        filteredParties.length > 0 &&
                        selectedParties.length === filteredParties.length
                      }
                      onChange={toggleSelectAll}
                    />
                  </span>
                </th>
                <th>Party Name</th>
                <th>Category</th>
                <th>Mobile Number</th>
                <th>Party Type</th>
                <th>Balance</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={7} className="empty-text">
                    Loading parties...
                  </td>
                </tr>
              )}
              {loadError && !isLoading && (
                <tr>
                  <td colSpan={7} className="empty-text">
                    {loadError}
                  </td>
                </tr>
              )}
              {!isLoading && !loadError && filteredParties.length === 0 && (
                <tr>
                  <td colSpan={7} className="empty-text">
                    No parties found
                  </td>
                </tr>
              )}
              {!isLoading &&
                !loadError &&
                filteredParties.map((party, index) => (
                  <tr
                    key={`${party.partyId || party.name}-${index}`}
                    className={selectedParties.includes(party.partyId) ? 'selected' : ''}
                  >
                    <td>
                      <span className="checkbox-col">
                        <input
                          type="checkbox"
                          checked={selectedParties.includes(party.partyId)}
                          onChange={() => toggleSelectParty(party.partyId)}
                        />
                      </span>
                    </td>
                    <td className="party-name">{party.name}</td>
                    <td>{party.category ?? '-'}</td>
                    <td>{party.phone || '-'}</td>
                    <td>{party.type || 'Customer'}</td>
                    <td
                      className={`balance ${
                        party.balance > 0
                          ? 'collect-balance'
                          : party.balance < 0
                          ? 'pay-balance'
                          : 'neutral-balance'
                      }`}
                    >
                      {'₹ ' + Math.abs(Number(party.balance || 0)).toLocaleString('en-IN')}
                    </td>
                    <td className="actions-column">
                      <div style={{ position: 'relative' }}>
                        <button
                          className="icon-btn slim"
                          aria-label="More actions"
                          onClick={() => toggleMenu(index)}
                        >
                          ⋮
                        </button>
                        {openMenuIndex === index && (
                          <div className="dropdown-menu">
                            <button
                              onClick={() => {
                                setSelectedParty(party);
                                setDrawerMode('history');
                                setOpenMenuIndex(null);
                              }}
                            >
                              View Details
                            </button>
                            <button onClick={() => handleEdit(party)}>Edit Customer</button>
                            <button
                              onClick={() => {
                                setSelectedParty(party);
                                setDrawerMode('history');
                                setOpenMenuIndex(null);
                              }}
                            >
                              View Ledger
                            </button>
                            <button
                              onClick={() => {
                                /* Navigate to Sales Invoices */
                              }}
                            >
                              View Sales Invoices
                            </button>
                            <button
                              onClick={() => {
                                /* Navigate to Payment Record */
                              }}
                            >
                              Record Payment
                            </button>
                            <button
                              className="delete-option"
                              onClick={() => handleDeleteClick(party)}
                            >
                              Delete Customer
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>

      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Delete Customer</h3>
            <p>
              Are you sure you want to delete <strong>{selectedParty?.name}</strong>?
            </p>
            <div className="modal-actions">
              <button className="ghost" onClick={() => setShowDeleteModal(false)}>
                Cancel
              </button>
              <button
                className="primary danger"
                onClick={confirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {drawerMode === 'history' ? (
        <CustomerHistoryDrawer
          isOpen={true}
          customerData={selectedParty}
          onClose={closeDrawer}
        />
      ) : drawerMode ? (
        <PartyDrawer
          mode={drawerMode}
          party={selectedParty}
          onClose={closeDrawer}
          onSave={handlePartyUpdated}
        />
      ) : null}
    </div>
  );
}
