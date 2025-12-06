import { NextResponse } from "next/server";

// 1. Define the Type (Fixes the 'any' error)
interface TabItem {
  id: number;
  title: string;
  content: string;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const tabItems: TabItem[] = body.tabItems;

    if (!tabItems || !Array.isArray(tabItems)) {
      return NextResponse.json({ error: "Invalid data provided" }, { status: 400 });
    }

    // === 2. Define Styles ===
    const s = {
      body: `font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f0f2f5; padding: 20px;`,
      container: `max-width: 800px; margin: 0 auto;`,
      nav: `display: flex; border-bottom: 1px solid #d1d5db;`,
      tabLink: `padding: 10px 20px; cursor: pointer; border: 1px solid transparent; border-bottom: none; background-color: #e5e7eb; font-size: 16px; margin-right: 2px; border-radius: 6px 6px 0 0;`,
      tabPanel: `display: none; padding: 20px; border: 1px solid #d1d5db; background-color: #fff; border-radius: 0 6px 6px 6px;`,
    };

    // === 3. Define Client-Side Script ===
    const scripts = `
      document.addEventListener('DOMContentLoaded', function() {
        const tabs = document.querySelectorAll('button[data-target]');
        const tabPanels = document.querySelectorAll('div[data-panel]');
        const inactiveTabStyle = 'background-color: #e5e7eb; border-color: transparent;';
        const activeTabStyle = 'background-color: #fff; border-color: #d1d5db; border-bottom-color: #fff; position: relative; top: 1px;';

        function switchTab(clickedTab) {
          tabPanels.forEach(panel => { panel.style.display = 'none'; });
          tabs.forEach(tab => { tab.setAttribute('style', '${s.tabLink}' + inactiveTabStyle); });

          const targetPanelId = clickedTab.getAttribute('data-target');
          const targetPanel = document.getElementById(targetPanelId);
          
          if (targetPanel) {
            clickedTab.setAttribute('style', '${s.tabLink}' + activeTabStyle);
            targetPanel.style.display = 'block';
          }
        }

        tabs.forEach(tab => {
          tab.addEventListener('click', function() { switchTab(this); });
        });

        if (tabs.length > 0) switchTab(tabs[0]);
      });
    `;

    // === 4. Construct HTML (Using strict types now) ===
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
      ${tabItems.map((tab: TabItem) => 
        `<button data-target="panel-${tab.id}" style="${s.tabLink}">${tab.title}</button>`
      ).join('')}
    </div>
    ${tabItems.map((tab: TabItem) => 
      `<div id="panel-${tab.id}" data-panel="true" style="${s.tabPanel}">${tab.content}</div>`
    ).join('')}
  </div>
  <script>${scripts}</script>
</body>
</html>`;

    return new NextResponse(finalHtml, {
      headers: {
        "Content-Type": "text/html",
        "Content-Disposition": 'attachment; filename="tabs.html"',
      },
    });

  } catch (error) {
    console.error("Lambda Generation Error:", error);
    return NextResponse.json({ error: "Failed to generate tabs" }, { status: 500 });
  }
}