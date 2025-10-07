"use client";

import { useState, useEffect, useRef } from 'react';
import Cookies from 'js-cookie';

interface TabItem {
  id: number;
  title: string;
  content: string;
}

export default function TabsGeneratorPage() {
  const [tabItems, setTabItems] = useState<TabItem[]>([]);
  const [activeTabId, setActiveTabId] = useState<number | null>(null);
  const [exportableHtml, setExportableHtml] = useState<string>('');
  const [isCopyNotificationVisible, setCopyNotificationVisible] = useState<boolean>(false);
  
  const [menuProps, setMenuProps] = useState<{ id: number | null, top: number, right: number, position: 'top' | 'bottom' }>({ id: null, top: 0, right: 0, position: 'bottom' });
  
  const [modalState, setModalState] = useState<{ type: 'rename' | 'delete' | null, tab: TabItem | null }>({ type: null, tab: null });
  const [newTitle, setNewTitle] = useState('');
  
  const [isDeleteAllConfirmModalOpen, setDeleteAllConfirmModalOpen] = useState<boolean>(false);

  const editorRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuProps({ id: null, top: 0, right: 0, position: 'bottom' });
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    try {
      const storedTabs = localStorage.getItem('tabData');
      if (storedTabs) {
        const parsedTabs: TabItem[] = JSON.parse(storedTabs);
        if (parsedTabs.length > 0) {
          setTabItems(parsedTabs);
          
          const storedActiveId = Cookies.get('activeTabId');
          const activeId = storedActiveId ? parseInt(storedActiveId, 10) : null;
          
          const activeTabExists = parsedTabs.some(tab => tab.id === activeId);

          if (activeId && activeTabExists) {
            setActiveTabId(activeId);
          } else {
            setActiveTabId(parsedTabs[0].id);
          }
        }
      } else {
        const defaultTab = { id: 1, title: 'Step 1', content: 'Content for Step 1' };
        setTabItems([defaultTab]);
        setActiveTabId(defaultTab.id);
      }
    } catch (error) {
      console.error("Failed to parse tabs from localStorage:", error);
      const defaultTab = { id: 1, title: 'Step 1', content: 'Content for Step 1' };
      setTabItems([defaultTab]);
      setActiveTabId(defaultTab.id);
    }
  }, []);

  useEffect(() => {
    if (tabItems.length > 0) {
      localStorage.setItem('tabData', JSON.stringify(tabItems));
    } else {
      localStorage.removeItem('tabData');
    }
  }, [tabItems]);
  
  useEffect(() => {
    if (activeTabId !== null) {
      Cookies.set('activeTabId', activeTabId.toString(), { expires: 365 });
    }
  }, [activeTabId]);

  useEffect(() => {
    const activeTab = tabItems.find(tab => tab.id === activeTabId);
    if (editorRef.current && activeTab) {
      if (editorRef.current.innerHTML !== activeTab.content) {
        editorRef.current.innerHTML = activeTab.content;
      }
    }
  }, [activeTabId, tabItems]);

  const handleToggleMenu = (tabId: number, target: HTMLButtonElement) => {
    if (menuProps.id === tabId) {
      setMenuProps({ id: null, top: 0, right: 0, position: 'bottom' });
      return;
    }
    
    const rect = target.getBoundingClientRect();
    const menuHeight = 80;
    
    let position: 'top' | 'bottom' = 'bottom';
    let top = rect.bottom + 4;
  
    if (rect.bottom + menuHeight > window.innerHeight) {
      position = 'top';
      top = rect.top - 4;
    }
  
    setMenuProps({
      id: tabId,
      top: top,
      right: window.innerWidth - rect.right,
      position: position,
    });
  };

  const handleAddNewTab = () => {
    if (tabItems.length >= 15) return;

    setTabItems(prevTabs => {
      const newId = prevTabs.length > 0 ? Math.max(...prevTabs.map(t => t.id)) + 1 : 1;
      const newTab: TabItem = {
        id: newId,
        title: `Step ${newId}`,
        content: `Content for Step ${newId}`,
      };
      setActiveTabId(newId);
      return [...prevTabs, newTab];
    });
  };

  const handleRenameTab = () => {
    if (!modalState.tab || !newTitle.trim()) return;
    setTabItems(tabs =>
      tabs.map(tab =>
        tab.id === modalState.tab?.id ? { ...tab, title: newTitle.trim() } : tab
      )
    );
    closeModal();
  };

  const handleRemoveTab = (tabIdToRemove: number) => {
    if (tabItems.length <= 1) return;

    const tabIndex = tabItems.findIndex(tab => tab.id === tabIdToRemove);
    const updatedTabs = tabItems.filter(tab => tab.id !== tabIdToRemove);
    
    let nextActiveTabId = null;
    if (updatedTabs.length > 0) {
        if (tabIndex > 0) {
            nextActiveTabId = updatedTabs[tabIndex - 1].id;
        } else {
            nextActiveTabId = updatedTabs[0].id;
        }
    }
    
    setTabItems(updatedTabs);
    setActiveTabId(nextActiveTabId);
    closeModal();
  };

  const handleDeleteAllTabs = () => {
    const defaultTab = { id: 1, title: 'Step 1', content: 'Content for Step 1' };
    setTabItems([defaultTab]);
    setActiveTabId(defaultTab.id);
    setDeleteAllConfirmModalOpen(false);
  };

  const openModal = (type: 'rename' | 'delete', tab: TabItem) => {
    setMenuProps({ id: null, top: 0, right: 0, position: 'bottom' });
    setModalState({ type, tab });
    if (type === 'rename') {
      setNewTitle(tab.title);
    }
  };

  const closeModal = () => {
    setModalState({ type: null, tab: null });
    setNewTitle('');
  };
  
  const handleContentChange = (newContent: string) => {
    setTabItems(prevTabs =>
      prevTabs.map(tab =>
        tab.id === activeTabId ? { ...tab, content: newContent } : tab
      )
    );
  };

  const generateExportHtml = () => {
    const s = {
      body: `font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f0f2f5; padding: 20px;`,
      container: `max-width: 800px; margin: 0 auto;`,
      nav: `display: flex; border-bottom: 1px solid #d1d5db;`,
      tabLink: `padding: 10px 20px; cursor: pointer; border: 1px solid transparent; border-bottom: none; background-color: #e5e7eb; font-size: 16px; margin-right: 2px; border-radius: 6px 6px 0 0;`,
      tabPanel: `display: none; padding: 20px; border: 1px solid #d1d5db; background-color: #fff; border-radius: 0 6px 6px 6px;`,
    };

    const scripts = `
      document.addEventListener('DOMContentLoaded', function() {
        const tabs = document.querySelectorAll('button[data-target]');
        const tabPanels = document.querySelectorAll('div[data-panel]');

        const inactiveTabStyle = 'background-color: #e5e7eb; border-color: transparent;';
        const activeTabStyle = 'background-color: #fff; border-color: #d1d5db; border-bottom-color: #fff; position: relative; top: 1px;';

        function switchTab(clickedTab) {
          // Hide all panels and reset all tab styles
          tabPanels.forEach(panel => {
            panel.style.display = 'none';
          });
          tabs.forEach(tab => {
            // Combine original style with inactive style
            tab.setAttribute('style', '${s.tabLink}' + inactiveTabStyle);
          });

          const targetPanelId = clickedTab.getAttribute('data-target');
          const targetPanel = document.getElementById(targetPanelId);
          
          if (targetPanel) {
            // Apply active styles to the clicked tab
            clickedTab.setAttribute('style', '${s.tabLink}' + activeTabStyle);
            // Show the target panel
            targetPanel.style.display = 'block';
          }
        }

        tabs.forEach(tab => {
          tab.addEventListener('click', function() {
            switchTab(this);
          });
        });

        // Initialize the first tab as active
        if (tabs.length > 0) {
          switchTab(tabs[0]);
        }
      });
    `;

    const finalHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Generated Tabs</title>
</head>
<body style="${s.body}">
  <div style="${s.container}">
    <div style="${s.nav}">
      ${tabItems.map(tab => `<button data-target="panel-${tab.id}" style="${s.tabLink}">${tab.title}</button>`).join('')}
    </div>
    ${tabItems.map(tab => `<div id="panel-${tab.id}" data-panel="true" style="${s.tabPanel}">${tab.content}</div>`).join('')}
  </div>
  <script>
    ${scripts}
  </script>
</body>
</html>`;

    setExportableHtml(finalHtml);
    const blob = new Blob([finalHtml], { type: 'text/html' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'tabs.html';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  const copyHtmlToClipboard = () => {
    navigator.clipboard.writeText(exportableHtml).then(() => {
      setCopyNotificationVisible(true);
      setTimeout(() => setCopyNotificationVisible(false), 2000);
    });
  };

  return (
    <div className="container min-w-full px-10 p-4">
      <main className="flex h-full justify-between items-start space-x-4">
        <div className="w-1/3 max-w-60 bg-hover p-4 rounded-lg shadow-md flex flex-col border border-shade">
          <div className="flex justify-between items-center sticky top-0 bg-hover pb-2 z-1">
            <h2 className="text-xl font-bold">Headers</h2>
            <button onClick={handleAddNewTab} className="cursor-pointer bg-button text-primary p-1 rounded-md hover:bg-shade border border-shade" title="Add new tab">
                Add
            </button>
          </div>
          <div className="flex-grow max-h-[calc(100vh-250px)] overflow-y-auto container-scrollbar mr-[10px]">
            <ul className="space-y-1">
              {tabItems.map(tab => (
                <li 
                  key={tab.id} 
                  className="flex justify-between items-center group rounded-md"
                  onClick={() => setActiveTabId(tab.id)}
                >
                  <button className={`w-full text-left p-2 rounded-md transition-colors ${activeTabId === tab.id ? 'underline decoration-primary underline-offset-4 font-bold' : 'hover:bg-shade'}`}>
                    {tab.title}
                  </button>
                  <button 
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      handleToggleMenu(tab.id, e.currentTarget);
                    }} 
                    className="ml-2 p-1 text-primary rounded-md hover:bg-shade" 
                    title="Options"
                  >
                    ⋮
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div className="pt-4">
            <button 
              onClick={() => setDeleteAllConfirmModalOpen(true)} 
              className="w-full cursor-pointer bg-red-500 text-white p-2 text-sm rounded-md hover:bg-red-600" 
              title="Clear all tabs"
            >
              Clear All
            </button>
          </div>
        </div>

        <div className="flex flex-1 flex-col h-full bg-hover p-4 rounded-lg shadow-md border border-shade">
          <div className="flex justify-between items-center sticky top-0 bg-hover mb-4">
            <h2 className="text-xl font-bold">Content</h2>
          </div>
          <div
            ref={editorRef}
            contentEditable="true"
            onInput={(e) => handleContentChange((e.target as HTMLDivElement).innerHTML)}
            className="flex-grow p-2 border border-shade rounded-md overflow-auto focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div className="flex flex-1 max-h-[calc(100vh-120px)] flex-col w-1/3 h-full bg-hover text-primary p-4 pt-3 rounded-lg shadow-md border border-shade">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-xl font-bold">Generated HTML Code</h2>
            <button onClick={generateExportHtml} className="cursor-pointer font-bold bg-button text-primary px-4 py-2 rounded-md hover:bg-shade border border-shade">
              Generate
            </button>
          </div>
          <pre className="relative flex-grow p-2 bg-background text-primary overflow-auto container-scrollbar text-sm rounded-md border border-shade">
            {exportableHtml && (
              <button 
                onClick={copyHtmlToClipboard} 
                className="absolute top-2 right-2 p-1 bg-button text-primary rounded-md hover:bg-shade" 
                title="Copy to clipboard"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M13 16h.01" />
                </svg>
              </button>
            )}
            <code>{exportableHtml}</code>
          </pre>
        </div>
      </main>

      {menuProps.id !== null && (() => {
        const tab = tabItems.find(t => t.id === menuProps.id);
        if (!tab) return null;

        const menuStyles: React.CSSProperties = {
          position: 'fixed',
          top: `${menuProps.top}px`,
          right: `${menuProps.right}px`,
          transform: menuProps.position === 'top' ? 'translateY(-100%)' : 'none',
        };

        return (
          <div 
            ref={menuRef} 
            style={menuStyles}
            className="z-20 w-32 bg-background rounded-md shadow-lg border border-shade"
          >
            <ul className="py-1">
              <li>
                <button onClick={() => openModal('rename', tab)} className="w-full text-left px-4 py-2 text-sm text-primary hover:bg-hover">Rename</button>
              </li>
              <li>
                <button onClick={() => openModal('delete', tab)} className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-hover">Delete</button>
              </li>
            </ul>
          </div>
        );
      })()}

      {isCopyNotificationVisible && (
        <div className="fixed bottom-10 right-10 p-2 px-4 rounded-lg bg-green-500 text-white shadow-lg animate-fade-in-out">
          Copied to clipboard!
        </div>
      )}

      {modalState.type === 'rename' && modalState.tab && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/50" onClick={closeModal}>
          <div className="bg-background text-primary p-8 rounded-lg shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-bold mb-4">Rename Tab</h2>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleRenameTab()}
              className="w-full p-2 mb-4 border rounded-md bg-hover"
              autoFocus
            />
            <div className="flex justify-end space-x-4">
              <button onClick={closeModal} className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600">Cancel</button>
              <button onClick={handleRenameTab} className="bg-primary text-background px-4 py-2 rounded-md hover:bg-button">Save</button>
            </div>
          </div>
        </div>
      )}

      {modalState.type === 'delete' && modalState.tab && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/50" onClick={closeModal}>
          <div className="bg-background text-primary p-8 rounded-lg shadow-xl text-center" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-bold mb-4">Confirm Deletion</h2>
            <p className="mb-6">Are you sure you want to delete the tab "{modalState.tab.title}"?</p>
            <div className="flex justify-center space-x-4">
              <button onClick={closeModal} className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600">Cancel</button>
              <button onClick={() => handleRemoveTab(modalState.tab!.id)} disabled={tabItems.length <= 1} className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 disabled:opacity-50">Delete</button>
            </div>
          </div>
        </div>
      )}

      {isDeleteAllConfirmModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/50" onClick={() => setDeleteAllConfirmModalOpen(false)}>
          <div className="bg-background text-primary p-8 rounded-lg shadow-xl text-center" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-bold mb-4">Delete All Tabs?</h2>
            <p className="mb-6">This will remove all tabs and content, resetting to a single default tab. <br/>This action cannot be undone.</p>
            <div className="flex justify-center space-x-4">
              <button onClick={() => setDeleteAllConfirmModalOpen(false)} className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600">Cancel</button>
              <button onClick={handleDeleteAllTabs} className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600">Yes, Delete All</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}