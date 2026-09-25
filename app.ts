type CaseType = 'happy' | 'validation' | 'auth' | 'performance';
type Filter = 'all' | CaseType;

type TestCase = {
  type: CaseType;
  title: string;
  detail: string;
  method: string;
};

type ApiOperation = { method: string; endpoint: string };

const baseCases: TestCase[] = [
  { type: 'happy', title: 'Returns the requested order', detail: 'Valid orderId and auth token return the full order payload.', method: '200 OK' },
  { type: 'happy', title: 'Returns the latest payment status', detail: 'Order response contains a current payment status and timestamp.', method: '200 OK' },
  { type: 'happy', title: 'Handles a valid UUID path value', detail: 'A correctly formatted orderId is accepted without coercion.', method: '200 OK' },
  { type: 'validation', title: 'Rejects a missing orderId', detail: 'A request with an empty path parameter returns a clear client error.', method: '400 Bad Request' },
  { type: 'validation', title: 'Rejects an unknown orderId', detail: 'A well-formed but nonexistent resource returns a not-found response.', method: '404 Not Found' },
  { type: 'validation', title: 'Rejects a malformed orderId', detail: 'Special characters and invalid formats are never treated as identifiers.', method: '400 Bad Request' },
  { type: 'validation', title: 'Returns a stable response schema', detail: 'Required fields are present and values match their documented types.', method: '200 OK' },
  { type: 'auth', title: 'Rejects a missing auth header', detail: 'Requests without credentials are denied before resource lookup.', method: '401 Unauthorized' },
  { type: 'auth', title: 'Rejects an expired token', detail: 'Expired credentials return a predictable auth error without leaking details.', method: '401 Unauthorized' },
  { type: 'auth', title: 'Enforces resource permissions', detail: 'A valid user cannot access an order outside their permission scope.', method: '403 Forbidden' },
  { type: 'performance', title: 'Returns within the response budget', detail: 'A normal request completes under the agreed latency threshold.', method: '200 OK' },
  { type: 'performance', title: 'Handles a slow upstream dependency', detail: 'An upstream timeout returns a safe error and does not hang the client.', method: '504 Gateway Timeout' }
];

const requiredElement = <T extends HTMLElement>(selector: string): T => {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Missing required element: ${selector}`);
  return element;
};

const form = requiredElement<HTMLFormElement>('#generatorForm');
const list = requiredElement<HTMLDivElement>('#casesList');
const emptyState = requiredElement<HTMLDivElement>('#emptyState');
const count = requiredElement<HTMLSpanElement>('#caseCount');
const search = requiredElement<HTMLInputElement>('#searchCases');
const toast = requiredElement<HTMLDivElement>('#toast');
const setupView = requiredElement<HTMLElement>('#setupView');
const resultsView = requiredElement<HTMLElement>('#resultsView');
const swaggerUrl = requiredElement<HTMLInputElement>('#swaggerUrl');
const jsonFile = requiredElement<HTMLInputElement>('#jsonFile');
let activeFilter: Filter = 'all';
let generatedCases: TestCase[] = [...baseCases];
let loadedOperations: ApiOperation[] = [];
let toastTimer: number | undefined;

function showResults(): void {
  setupView.hidden = true;
  resultsView.hidden = false;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function openApiOperations(document: Record<string, unknown>): ApiOperation[] {
  const paths = document.paths;
  if (!paths || typeof paths !== 'object') return [];
  return Object.entries(paths).flatMap(([endpoint, operations]) => {
    if (!operations || typeof operations !== 'object') return [];
    return Object.keys(operations)
      .filter((method) => ['get', 'post', 'put', 'patch', 'delete'].includes(method.toLowerCase()))
      .map((method) => ({ method: method.toUpperCase(), endpoint }));
  });
}

function currentEndpoint(): string {
  return requiredElement<HTMLInputElement>('#endpoint').value.trim() || 'your endpoint';
}

function formValue(data: FormData, name: string): string {
  const value = data.get(name);
  return typeof value === 'string' ? value : '';
}

function renderCases(): void {
  const query = search.value.trim().toLowerCase();
  const visible = generatedCases.filter((item) => {
    const matchesFilter = activeFilter === 'all' || item.type === activeFilter;
    const matchesSearch = `${item.title} ${item.detail} ${item.method}`.toLowerCase().includes(query);
    return matchesFilter && matchesSearch;
  });

  count.textContent = String(generatedCases.length);
  list.innerHTML = visible.map((item, index) => `
    <article class="case-card" style="animation-delay: ${index * 35}ms">
      <span class="case-number">${String(generatedCases.indexOf(item) + 1).padStart(2, '0')}</span>
      <div><h3>${item.title}</h3><p>${item.detail}</p></div>
      <span class="case-chip ${item.type}">${item.method}</span>
    </article>
  `).join('');
  emptyState.hidden = visible.length !== 0;
}

function showToast(message: string): void {
  toast.textContent = message;
  toast.classList.add('show');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove('show'), 2400);
}

form.addEventListener('submit', (event: SubmitEvent) => {
  event.preventDefault();
  const data = new FormData(form);
  const method = formValue(data, 'method');
  const response = formValue(data, 'response');
  const endpoint = currentEndpoint();
  const resourceId = endpoint.split('/').pop() || 'resourceId';

  const operations = loadedOperations.length ? loadedOperations : [{ method, endpoint }];
  generatedCases = operations.flatMap((operation) => baseCases.map((item) => ({
    ...item,
    title: `${operation.method} ${operation.endpoint} - ${item.title.replace('order', operation.method === 'GET' ? 'order' : 'resource')}`,
    detail: item.detail.replace('orderId', operation.endpoint.split('/').pop() || resourceId),
    method: item.type === 'happy' ? response : item.method
  })).filter((item) => {
    if (item.type === 'auth' && !data.has('security')) return false;
    if (item.type === 'performance' && !data.has('performance')) return false;
    if (item.type === 'validation' && !data.has('boundary')) return false;
    return true;
  }));

  activeFilter = 'all';
  document.querySelectorAll<HTMLButtonElement>('.filter-tab').forEach((tab) => tab.classList.toggle('active', tab.dataset.filter === 'all'));
  renderCases();
  showResults();
  showToast(`${generatedCases.length} cases generated for ${method} ${endpoint}`);
});

requiredElement<HTMLButtonElement>('#backButton').addEventListener('click', () => {
  resultsView.hidden = true;
  setupView.hidden = false;
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

requiredElement<HTMLButtonElement>('#swaggerButton').addEventListener('click', () => {
  const value = swaggerUrl.value.trim();
  if (!value) {
    swaggerUrl.focus();
    showToast('Add a Swagger or OpenAPI URL first');
    return;
  }
  requiredElement<HTMLInputElement>('#endpoint').value = value;
  showToast('Swagger URL added to the endpoint form');
});

jsonFile.addEventListener('change', async () => {
  const file = jsonFile.files?.[0];
  if (!file) return;
  try {
    const document = JSON.parse(await file.text()) as Record<string, unknown>;
    loadedOperations = openApiOperations(document);
    if (!loadedOperations.length) throw new Error('No OpenAPI paths found');
    const server = Array.isArray(document.servers) && document.servers[0] && typeof document.servers[0] === 'object' && 'url' in document.servers[0]
      ? String((document.servers[0] as { url: unknown }).url)
      : '';
    requiredElement<HTMLSelectElement>('#method').value = loadedOperations[0].method;
    requiredElement<HTMLInputElement>('#endpoint').value = `${server}${loadedOperations[0].endpoint}`;
    loadedOperations = loadedOperations.map((operation) => ({ ...operation, endpoint: `${server}${operation.endpoint}` }));
    showToast(`Loaded ${loadedOperations.length} API operations from JSON`);
  } catch {
    showToast('That file does not contain readable OpenAPI paths');
  }
});

document.querySelectorAll<HTMLButtonElement>('.filter-tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    const filter = tab.dataset.filter;
    if (filter !== 'all' && filter !== 'happy' && filter !== 'validation' && filter !== 'auth' && filter !== 'performance') return;
    activeFilter = filter;
    document.querySelectorAll<HTMLButtonElement>('.filter-tab').forEach((item) => item.classList.toggle('active', item === tab));
    renderCases();
  });
});
search.addEventListener('input', renderCases);

requiredElement<HTMLButtonElement>('#copyButton').addEventListener('click', async () => {
  const text = generatedCases.map((item, index) => `${index + 1}. ${item.title}\n   ${item.detail}\n   Expected: ${item.method}`).join('\n\n');
  try {
    await navigator.clipboard.writeText(text);
    showToast('Test cases copied to clipboard');
  } catch {
    showToast('Copy is unavailable in this browser');
  }
});

requiredElement<HTMLButtonElement>('#downloadButton').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify({ endpoint: currentEndpoint(), cases: generatedCases }, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'smart-hub-api-test-cases.json';
  link.click();
  URL.revokeObjectURL(link.href);
  showToast('JSON suite downloaded');
});

requiredElement<HTMLButtonElement>('#themeButton').addEventListener('click', () => {
  document.body.classList.toggle('high-contrast');
  showToast(document.body.classList.contains('high-contrast') ? 'High contrast on' : 'High contrast off');
});

renderCases();
