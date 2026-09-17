'use strict';

const KNOWLEDGE = Object.freeze({
  pe: { title: 'P/E ratio', answer: 'P/E compares a company’s share price with earnings per share. A higher P/E can reflect higher expectations, but it should be interpreted with growth, sector context and earnings quality.' },
  eps: { title: 'EPS', answer: 'EPS means earnings per share: profit attributable to equity shareholders divided by the relevant share count. Compare EPS across periods only after checking whether the basis is standalone or consolidated.' },
  dividend: { title: 'Dividend', answer: 'A dividend is a distribution declared by a company to eligible shareholders. Record date and ex-date determine eligibility; the exact amount and dates should come from the verified corporate filing.' },
  market_cap: { title: 'Market capitalisation', answer: 'Market capitalisation is the market value of a company’s equity, generally calculated from share price multiplied by the relevant outstanding share count.' },
  fii: { title: 'FII/FPI holding', answer: 'FII/FPI holding represents ownership reported by foreign portfolio investors. Changes can be useful context, but they do not by themselves establish a future price direction.' },
  delivery: { title: 'Delivery percentage', answer: 'Delivery percentage measures the portion of traded quantity reported as delivery rather than intraday trading, subject to the source methodology. It is a market-activity metric, not a standalone buy or sell signal.' },
  support: { title: 'Support', answer: 'Technical support is a price area where historical demand has appeared. It is an analytical concept, not a guarantee that price will hold there.' },
  resistance: { title: 'Resistance', answer: 'Technical resistance is a price area where historical supply has appeared. A break above resistance should be evaluated with volume, confirmation and the broader market context.' }
});

function answer(query) {
  const q = String(query || '').toLowerCase();
  const hit = Object.entries(KNOWLEDGE).find(([key, value]) => q.includes(key.replace('_', ' ')) || q.includes(value.title.toLowerCase()));
  if (!hit) return { found: false, answer: null, source: 'Tara Finance Knowledge Engine' };
  return { found: true, topic: hit[1].title, answer: hit[1].answer, source: 'Tara Finance Knowledge Engine', educational: true };
}

module.exports = { KNOWLEDGE, answer };
