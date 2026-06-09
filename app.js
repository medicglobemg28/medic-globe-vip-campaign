const GA_ID = "G-KY2HEC6B46";

const locations = [
  { code: "yc_tcm_ss2", label: "YC TCM SS2", type: "中医馆" },
  { code: "tcm_ampang", label: "Ampang 中医馆", type: "中医馆" },
  { code: "gyn_pj", label: "PJ 妇科诊所", type: "妇科诊疗所" },
  { code: "baby_kl", label: "KL 母婴店", type: "母婴店" },
  { code: "expo_2026", label: "母婴展 2026", type: "展会" },
];

let partners = [
  {
    id: "diamond-baby",
    name: "Diamond Baby Confinement Center",
    area: "Selangor",
    link: "https://www.facebook.com/",
    linkLabel: "Facebook",
  },
  {
    id: "yk-home",
    name: "YK Confinement Home",
    area: "Kuala Lumpur",
    link: "https://www.facebook.com/",
    linkLabel: "Facebook",
  },
  {
    id: "mama-care",
    name: "Mama Care Confinement",
    area: "Penang",
    link: "https://www.youtube.com/",
    linkLabel: "Video",
  },
  {
    id: "harmony-mom",
    name: "Harmony Mom Care",
    area: "Johor",
    link: "https://www.facebook.com/",
    linkLabel: "Facebook",
  },
];

let adminState = { leads: [], conversions: [], partners: [] };
let internalMode = false;

function track(eventName, params = {}) {
  if (typeof window.gtag === "function") {
    window.gtag("event", eventName, {
      send_to: GA_ID,
      ...params,
    });
  }
}

async function apiRequest(path, options = {}) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.message || "Request failed");
  }
  return payload;
}

function sourceFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("source") || params.get("utm_source") || "unknown";
}

function locationLabel(code) {
  return locations.find((location) => location.code === code)?.label || code;
}

function normalizePhone(phone) {
  return String(phone || "").replace(/[^\d+]/g, "");
}

function formatDate(iso) {
  if (!iso) return "-";
  return new Intl.DateTimeFormat("en-MY", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

function getLatestConversion(vipCode, state) {
  return [...state.conversions].reverse().find((item) => item.vipCode === vipCode);
}

function stageLabel(stage) {
  return {
    consulted: "已咨询",
    visited: "已预约参观",
    signed: "已签单",
  }[stage] || "未回报";
}

async function loadPartners() {
  try {
    const payload = await apiRequest("/api/partners");
    partners = payload.partners.length ? payload.partners : partners;
  } catch {
    // Keep the default fallback list if the API is not ready yet.
  }
}

function renderPartnerList(preferredArea = "") {
  const container = document.querySelector("#publicPartnerList");
  if (!container) return;
  container.innerHTML = renderGroupedPartnerList(preferredArea, true);

  const select = document.querySelector("#partnerSelect");
  select.innerHTML = partners
    .map((partner) => `<option value="${partner.id}">${partner.name}</option>`)
    .join("");
}

function groupedPartners(preferredArea = "", onlyPreferred = false) {
  const groups = partners.reduce((items, partner) => {
    items[partner.area] = items[partner.area] || [];
    items[partner.area].push(partner);
    return items;
  }, {});
  let areas = Object.keys(groups);
  if (onlyPreferred && preferredArea) {
    areas = areas.filter((area) => area === preferredArea);
  }
  areas = areas.sort((left, right) => {
    if (left === preferredArea) return -1;
    if (right === preferredArea) return 1;
    return left.localeCompare(right);
  });
  return areas.map((area) => ({ area, partners: groups[area] }));
}

function renderGroupedPartnerList(preferredArea = "", onlyPreferred = false) {
  const groups = groupedPartners(preferredArea, onlyPreferred);
  if (!groups.length) {
    return `<div class="partner-item"><strong>暂时没有这个地区的合作月子中心</strong><small>请选择其他地区或联系 永生 SWS28。</small></div>`;
  }
  return groups
    .map(
      (group) => `
        <section class="partner-group">
          <h4>${group.area}</h4>
          <div class="partner-list compact">
            ${group.partners
              .map(
                (partner) => `
                  <a class="partner-item partner-link" href="/api/partner-click?id=${encodeURIComponent(partner.id)}" target="_blank" rel="noopener noreferrer">
                    <strong>${partner.name}</strong>
                    <small>${partner.linkLabel} · 点击查看详情 · ${Number(partner.clicks || 0)} 次点击</small>
                  </a>
                `,
              )
              .join("")}
          </div>
        </section>
      `,
    )
    .join("");
}

function renderSource() {
  const source = sourceFromUrl();
  document.querySelector("#currentSourceLabel").textContent = locationLabel(source);
  const sourceCode = document.querySelector("#currentSourceCode");
  if (sourceCode) sourceCode.textContent = source;
}

function todayDateValue() {
  const today = new Date();
  const offset = today.getTimezoneOffset();
  const localDate = new Date(today.getTime() - offset * 60 * 1000);
  return localDate.toISOString().slice(0, 10);
}

function setDueDateMin() {
  const dueDate = document.querySelector('input[name="dueDate"]');
  if (!dueDate) return;
  dueDate.min = todayDateValue();
}

function showView() {
  internalMode = internalMode || new URLSearchParams(window.location.search).get("mode") === "admin";
  document.body.classList.toggle("internal-mode", internalMode);
  let active = (window.location.hash || "#register").replace("#", "");
  if (!internalMode && ["redeem", "partner", "admin"].includes(active)) {
    active = "register";
    history.replaceState(null, "", `${location.pathname}${location.search}#register`);
  }
  document.querySelectorAll(".view").forEach((view) => {
    view.classList.toggle("active", view.id === active);
  });
  document.querySelectorAll("[data-nav]").forEach((item) => {
    item.classList.toggle("active", item.dataset.nav === active);
  });
  if (active === "admin") renderAdmin();
  track("campaign_view", { app_section: active, source: sourceFromUrl() });
}

async function handleLeadSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const data = Object.fromEntries(new FormData(form));
  const source = sourceFromUrl();

  try {
    renderFormBusy(form, true);
    const payload = await apiRequest("/api/leads", {
      method: "POST",
      body: JSON.stringify({
        name: data.name.trim(),
        phone: normalizePhone(data.phone),
        area: "",
        dueDate: data.dueDate,
        interest: "月子中心名单",
        source,
        sourceLabel: locationLabel(source),
        partners: partners.map((partner) => `${partner.name} (${partner.area}) - ${partner.link}`),
        redeemLink: `${location.origin}${location.pathname}#redeem`,
      }),
    });

    renderLeadSuccess(payload.lead, Boolean(payload.duplicate));
    if (!payload.duplicate) form.reset();

    track(payload.duplicate ? "lead_duplicate_found" : "lead_submitted", {
      source,
      vip_code: payload.lead.vipCode,
      area: payload.lead.area,
      interest: "月子中心名单",
    });
  } catch (error) {
    renderLeadError(error.message);
    track("lead_submit_failed", { source });
  } finally {
    renderFormBusy(form, false);
  }
}

function renderFormBusy(form, isBusy) {
  form.querySelectorAll("button, input, select, textarea").forEach((node) => {
    node.disabled = isBusy;
  });
}

function renderLeadSuccess(lead, isDuplicate) {
  const template = document.querySelector("#successTemplate");
  const fragment = template.content.cloneNode(true);
  fragment.querySelector("h3").textContent = isDuplicate
    ? `${lead.name}，你已经登记过了`
    : `${lead.name}，这是你的专属 VIP 码`;
  fragment.querySelector(".large-code").textContent = lead.vipCode;
  fragment.querySelector(".muted").textContent =
    "请截图保存。凭这个 VIP 码可在柜台领取小礼物，并向合作月子中心查询专属优惠。";

  const result = document.querySelector("#leadResult");
  result.innerHTML = "";
  result.appendChild(fragment);
  result.appendChild(renderGiftRedeemPanel(lead));
  result.appendChild(renderAreaChooser(lead));
}

function renderGiftRedeemPanel(lead) {
  const panel = document.createElement("div");
  panel.className = "gift-panel";
  const redeemedDate = lead.redeemedAt ? formatDate(lead.redeemedAt) : "";
  panel.innerHTML = lead.giftRedeemed
    ? `
      <strong>小礼物已领取</strong>
      <span>领取日期：${redeemedDate}</span>
    `
    : `
      <strong>柜台领取确认</strong>
      <span>到柜台领取小礼物时，请由工作人员点击确认。</span>
      <button class="ghost-action" type="button" id="inlineRedeemButton">确认已经领取</button>
      <span id="inlineRedeemResult"></span>
    `;

  const button = panel.querySelector("#inlineRedeemButton");
  if (button) {
    button.addEventListener("click", async () => {
      const result = panel.querySelector("#inlineRedeemResult");
      button.disabled = true;
      try {
        const payload = await apiRequest("/api/redeem", {
          method: "POST",
          body: JSON.stringify({ action: "confirm", vipCode: lead.vipCode }),
        });
        result.textContent = `领取日期：${formatDate(payload.lead.redeemedAt)}`;
        button.textContent = "已领取";
        track("gift_redeemed_inline", { vip_code: lead.vipCode, source: lead.source });
      } catch (error) {
        result.textContent = error.message || "确认失败，请稍后再试。";
        button.disabled = false;
      }
    });
  }
  return panel;
}

function renderAreaChooser(lead) {
  const wrapper = document.createElement("div");
  wrapper.className = "area-panel";
  wrapper.innerHTML = `
    <label>
      所在地区
      <select id="postSubmitArea" required>
        <option value="">请选择地区以查看合作月子中心名单</option>
        <option ${lead.area === "Selangor" ? "selected" : ""}>Selangor</option>
        <option ${lead.area === "Kuala Lumpur" ? "selected" : ""}>Kuala Lumpur</option>
        <option ${lead.area === "Penang" ? "selected" : ""}>Penang</option>
        <option ${lead.area === "Johor" ? "selected" : ""}>Johor</option>
        <option ${lead.area === "Perak" ? "selected" : ""}>Perak</option>
        <option ${lead.area === "Melaka" ? "selected" : ""}>Melaka</option>
        <option ${lead.area === "其他" ? "selected" : ""}>其他</option>
      </select>
    </label>
    <div id="postSubmitPartnerList" class="partner-list"></div>
  `;

  const select = wrapper.querySelector("#postSubmitArea");
  const list = wrapper.querySelector("#postSubmitPartnerList");
  const renderList = (area) => {
    list.innerHTML = area ? renderGroupedPartnerList(area, true) : "";
  };
  renderList(lead.area);
  select.addEventListener("change", async () => {
    const area = select.value;
    renderList(area);
    if (!area) return;
    try {
      await apiRequest("/api/leads", {
        method: "PATCH",
        body: JSON.stringify({ vipCode: lead.vipCode, area }),
      });
      track("lead_area_selected", { vip_code: lead.vipCode, area });
    } catch {
      // The list can still be shown even if saving the area is temporarily unavailable.
    }
  });
  return wrapper;
}

function renderLeadError(message) {
  document.querySelector("#leadResult").innerHTML = `
    <h3>暂时无法提交</h3>
    <p>${message || "请稍后再试，或联系 永生 SWS28 team。"}</p>
  `;
}

function renderWhatsAppStatus(status, message = "") {
  const node = document.querySelector("#whatsappStatus");
  if (!node) return;

  const copy = {
    sending: ["发送中", "正在通过 WhatsApp 自动发送 VIP 码与月子中心名单。"],
    sent: ["WhatsApp 已发送", message || "VIP 码与月子中心名单已经自动发送。"],
    "dry-run": ["WhatsApp 测试模式", message || "已模拟发送。加入 API credentials 后会真实发送。"],
    offline: ["WhatsApp 未连接", message],
    failed: ["WhatsApp 发送失败", message],
  }[status] || ["WhatsApp 状态", message || "等待发送。"];

  node.dataset.status = status || "pending";
  node.innerHTML = `
    <strong>${copy[0]}</strong>
    <span>${copy[1]}</span>
  `;
}

async function handleRedeemSubmit(event) {
  event.preventDefault();
  const lookup = new FormData(event.currentTarget).get("lookup").trim();
  const result = document.querySelector("#redeemResult");

  try {
    const payload = await apiRequest("/api/redeem", {
      method: "POST",
      body: JSON.stringify({ action: "lookup", lookup }),
    });
    const lead = payload.lead;

    if (lead.giftRedeemed) {
      result.innerHTML = `
        <h3>已领取</h3>
        <p><strong>${lead.name}</strong> 的小礼物已在 ${formatDate(lead.redeemedAt)} 领取。</p>
        <p class="large-code">${lead.vipCode}</p>
      `;
      track("gift_redeem_duplicate", { vip_code: lead.vipCode, source: lead.source });
      return;
    }

    result.innerHTML = `
      <h3>可以领取</h3>
      <p><strong>${lead.name}</strong> 来自 ${locationLabel(lead.source)}。</p>
      <p class="large-code">${lead.vipCode}</p>
      <button class="primary-action" id="confirmRedeemButton" type="button">确认已领取</button>
    `;

    document.querySelector("#confirmRedeemButton").addEventListener("click", async () => {
      const confirmPayload = await apiRequest("/api/redeem", {
        method: "POST",
        body: JSON.stringify({ action: "confirm", vipCode: lead.vipCode }),
      });
      const redeemedLead = confirmPayload.lead;
      result.innerHTML = `
        <h3>领取完成</h3>
        <p>${redeemedLead.name} 的小礼物状态已更新为已领取。</p>
        <p class="large-code">${redeemedLead.vipCode}</p>
      `;
      track("gift_redeemed", { vip_code: redeemedLead.vipCode, source: redeemedLead.source });
    });
  } catch (error) {
    result.innerHTML = `
      <h3>找不到记录</h3>
      <p>${error.message || "请确认 VIP 码或 WhatsApp 是否输入正确。"}</p>
    `;
    track("gift_lookup_failed", { lookup_type: lookup.toLowerCase().startsWith("vip") ? "vip" : "phone" });
  }
}

async function handleConversionSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const data = Object.fromEntries(new FormData(form));
  const result = document.querySelector("#conversionResult");

  try {
    renderFormBusy(form, true);
    const payload = await apiRequest("/api/conversions", {
      method: "POST",
      body: JSON.stringify({
        partnerId: data.partner,
        vipCode: data.vipCode.trim().toUpperCase(),
        stage: data.stage,
        amount: Number(data.amount || 0),
        notes: data.notes.trim(),
      }),
    });
    form.reset();
    result.textContent = `已记录 ${payload.conversion.vipCode}：${stageLabel(payload.conversion.stage)}。`;
    track("partner_conversion_reported", {
      vip_code: payload.conversion.vipCode,
      partner_id: payload.conversion.partnerId,
      stage: payload.conversion.stage,
      value: payload.conversion.amount,
    });
  } catch (error) {
    result.textContent = error.message || "提交失败，请确认 VIP 码。";
    track("partner_report_failed", { vip_code: data.vipCode });
  } finally {
    renderFormBusy(form, false);
  }
}

async function renderAdmin() {
  const metrics = document.querySelector("#metrics");
  metrics.innerHTML = `<div class="metric"><span>正在读取</span><strong>...</strong></div>`;
  try {
    adminState = await apiRequest("/api/admin");
    partners = adminState.partners.length ? adminState.partners : partners;
    renderAdminFromState(adminState);
  } catch (error) {
    metrics.innerHTML = `<div class="metric"><span>后台连接失败</span><strong>!</strong></div>`;
    document.querySelector("#locationList").innerHTML = `<div class="stack-item">请确认 D1 binding 已设置为 DB。</div>`;
    document.querySelector("#partnerStats").innerHTML = "";
    document.querySelector("#leadTableBody").innerHTML = `<tr><td colspan="6">${error.message}</td></tr>`;
  }
}

function renderAdminFromState(state) {
  const signed = state.conversions.filter((item) => item.stage === "signed");
  const revenue = signed.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const redeemed = state.leads.filter((lead) => lead.giftRedeemed).length;

  document.querySelector("#metrics").innerHTML = [
    ["总登记", state.leads.length],
    ["已领取礼物", redeemed],
    ["已签单", signed.length],
    ["签单金额 RM", revenue.toLocaleString("en-MY")],
  ]
    .map(([label, value]) => `<div class="metric"><span>${label}</span><strong>${value}</strong></div>`)
    .join("");

  renderLocations(state);
  renderPartnerStats(state);
  renderPartnerClickStats(state);
  renderLeadTable(state);
}

function renderLocations(state) {
  const baseUrl = `${location.origin}${location.pathname}`;
  document.querySelector("#locationList").innerHTML = locations
    .map((locationItem) => {
      const count = state.leads.filter((lead) => lead.source === locationItem.code).length;
      const redeemed = state.leads.filter(
        (lead) => lead.source === locationItem.code && lead.giftRedeemed,
      ).length;
      const link = `${baseUrl}?source=${locationItem.code}#register`;
      return `
        <div class="stack-item">
          <strong>${locationItem.label}</strong>
          <small>${locationItem.type} · ${count} 登记 · ${redeemed} 已领取</small>
          <small>${link}</small>
        </div>
      `;
    })
    .join("");
}

function renderPartnerStats(state) {
  document.querySelector("#partnerStats").innerHTML = partners
    .map((partner) => {
      const reports = state.conversions.filter((item) => item.partnerId === partner.id);
      const signed = reports.filter((item) => item.stage === "signed");
      const revenue = signed.reduce((sum, item) => sum + Number(item.amount || 0), 0);
      return `
        <div class="stack-item">
          <strong>${partner.name}</strong>
          <small>${reports.length} 回报 · ${signed.length} 签单 · RM ${revenue.toLocaleString("en-MY")}</small>
        </div>
      `;
    })
    .join("");
}

function renderPartnerClickStats(state) {
  const container = document.querySelector("#partnerClickStats");
  if (!container) return;
  const items = (state.partners || partners).slice().sort((left, right) => {
    return Number(right.clicks || 0) - Number(left.clicks || 0);
  });
  container.innerHTML =
    items
      .map(
        (partner) => `
          <div class="stack-item">
            <strong>${partner.name}</strong>
            <small>${partner.area} · ${Number(partner.clicks || 0)} 点击 · ${partner.linkLabel}</small>
          </div>
        `,
      )
      .join("") || `<div class="stack-item">还没有合作伙伴资料。</div>`;
}

async function handlePartnerSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const data = Object.fromEntries(new FormData(form));
  const result = document.querySelector("#partnerFormResult");

  try {
    renderFormBusy(form, true);
    const payload = await apiRequest("/api/partners", {
      method: "POST",
      body: JSON.stringify({
        name: data.name.trim(),
        area: data.area,
        link: data.link.trim(),
        linkLabel: data.linkLabel,
      }),
    });
    partners.push(payload.partner);
    form.reset();
    result.textContent = `已加入：${payload.partner.name}`;
    await renderAdmin();
  } catch (error) {
    result.textContent = error.message || "新增失败，请检查链接。";
  } finally {
    renderFormBusy(form, false);
  }
}

function renderLeadTable(state) {
  const query = document.querySelector("#leadSearch").value.trim().toLowerCase();
  const rows = state.leads.filter((lead) => {
    const text = `${lead.vipCode} ${lead.name} ${lead.phone} ${lead.source}`.toLowerCase();
    return text.includes(query);
  });

  document.querySelector("#leadTableBody").innerHTML =
    rows
      .map((lead) => {
        const conversion = getLatestConversion(lead.vipCode, state);
        const giftClass = lead.giftRedeemed ? "" : "warning";
        const conversionClass = conversion?.stage === "signed" ? "" : "warning";
        return `
          <tr>
            <td><strong>${lead.vipCode}</strong><br><small>${formatDate(lead.createdAt)}</small></td>
            <td>${lead.name}<br><small>${lead.area} · ${lead.dueDate}</small></td>
            <td>${lead.phone}</td>
            <td>${locationLabel(lead.source)}</td>
            <td><span class="badge ${giftClass}">${lead.giftRedeemed ? "已领取" : "未领取"}</span></td>
            <td><span class="badge ${conversionClass}">${conversion ? stageLabel(conversion.stage) : "未回报"}</span></td>
          </tr>
        `;
      })
      .join("") || `<tr><td colspan="6">还没有符合条件的资料。</td></tr>`;
}

async function seedDemoData() {
  try {
    await apiRequest("/api/admin", { method: "POST", body: JSON.stringify({ action: "seed" }) });
    await renderAdmin();
    track("demo_data_seeded");
  } catch (error) {
    alert(error.message || "示范资料加入失败。");
  }
}

function exportCsv() {
  const rows = [
    ["VIP Code", "Name", "Phone", "Area", "Due Date", "Interest", "Source", "Gift Redeemed", "Latest Stage"],
    ...adminState.leads.map((lead) => {
      const conversion = getLatestConversion(lead.vipCode, adminState);
      return [
        lead.vipCode,
        lead.name,
        lead.phone,
        lead.area,
        lead.dueDate,
        lead.interest,
        lead.source,
        lead.giftRedeemed ? "Yes" : "No",
        conversion ? stageLabel(conversion.stage) : "None",
      ];
    }),
  ];
  const csv = rows
    .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "medic-globe-vip-campaign.csv";
  link.click();
  URL.revokeObjectURL(url);
  track("admin_export_csv");
}

async function copyQrLinks() {
  const baseUrl = `${location.origin}${location.pathname}`;
  const links = locations
    .map((locationItem) => `${locationItem.label}: ${baseUrl}?source=${locationItem.code}#register`)
    .join("\n");
  await navigator.clipboard.writeText(links);
  document.querySelector("#copyLinksButton").textContent = "已复制";
  setTimeout(() => {
    document.querySelector("#copyLinksButton").textContent = "复制链接";
  }, 1600);
  track("admin_copy_qr_links");
}

function bindEvents() {
  window.addEventListener("hashchange", showView);
  document.querySelector("#leadForm").addEventListener("submit", handleLeadSubmit);
  document.querySelector("#redeemForm").addEventListener("submit", handleRedeemSubmit);
  document.querySelector("#conversionForm").addEventListener("submit", handleConversionSubmit);
  document.querySelector("#partnerForm").addEventListener("submit", handlePartnerSubmit);
  document.querySelector("#seedButton").addEventListener("click", seedDemoData);
  document.querySelector("#exportButton").addEventListener("click", exportCsv);
  document.querySelector("#copyLinksButton").addEventListener("click", copyQrLinks);
  document.querySelector("#leadSearch").addEventListener("input", () => renderLeadTable(adminState));
}

async function init() {
  await loadPartners();
  renderSource();
  setDueDateMin();
  bindEvents();
  showView();
}

init();
