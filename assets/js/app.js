// ==========================================
// 🔴 配置区域 (请修改这里)
// ==========================================
const CONFIG = {
    // 你的 GitHub 用户名
    repoOwner: "ljrrr-bit",

    // 你的仓库名称https://github.com//.git
    repoName: "NoteTime",
    
    // 分支名称 (通常是 main 或 master)
    branch: "main",

    // 你的 posts 文件夹路径 (通常不用改)
    basePath: "posts"
};
// ==========================================


let allPosts = [];
let currentPosts = [];
let currentPage = 1;
const postsPerPage = 10;

document.addEventListener('DOMContentLoaded', init);

async function init() {
    try {
        // 检查是否配置了用户名
        if (CONFIG.repoOwner === "你的GitHub用户名") {
            showError("请先打开 assets/js/app.js 修改配置区域，填入你的 GitHub 用户名和仓库名！");
            return;
        }

        // 1. 从 GitHub API 获取文件列表
        const files = await fetchFileList();
        
        // 2. 解析文件列表为文章对象
        allPosts = parseFilesToPosts(files);
        currentPosts = [...allPosts];

        // 3. 渲染界面
        if (allPosts.length === 0) {
            document.getElementById('timeline-feed').innerHTML = '<p style="text-align:center;">没有找到日记文件。请确认 posts 文件夹下有 .md 文件。</p>';
        } else {
            renderCalendar(allPosts);
            renderTimeline(true);
        }
        
        // 绑定事件
        document.querySelector('.close-modal').addEventListener('click', closeModal);
        window.addEventListener('click', (e) => {
            if (e.target === document.getElementById('post-modal')) {
                closeModal();
            }
        });

    } catch (error) {
        console.error('Init Error:', error);
        showError("加载失败。可能是 GitHub API 限制或配置错误。<br>请检查控制台 (F12) 查看详细错误。");
    }
}

// 从 GitHub API 获取整个仓库的文件树
async function fetchFileList() {
    // API 文档: https://docs.github.com/en/rest/git/trees
    // recursive=1 表示递归获取所有子文件夹的文件
    const url = `https://api.github.com/repos/${CONFIG.repoOwner}/${CONFIG.repoName}/git/trees/${CONFIG.branch}?recursive=1`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
        if (response.status === 404) throw new Error("仓库未找到 (404)。请检查用户名和仓库名是否正确，或者仓库是否为 Public。");
        if (response.status === 403) throw new Error("API 访问频率受限 (403)。请稍后再试。");
        throw new Error(`GitHub API Error: ${response.status}`);
    }

    const data = await response.json();
    
    // 筛选出 posts 目录下的 markdown 和 txt 文件
    return data.tree.filter(item => 
        item.path.startsWith(CONFIG.basePath) && 
        (item.path.endsWith('.md') || item.path.endsWith('.txt')) &&
        item.type === 'blob' // blob 代表是文件
    );
}

function parseFilesToPosts(files) {
    // 将文件路径解析为文章数据
    // 期望路径格式: posts/2024/01/01/文件名.md (但也兼容乱序)
    
    const posts = files.map(file => {
        const pathParts = file.path.split('/');
        const fileName = pathParts[pathParts.length - 1];
        
        // 尝试从路径中提取日期
        let dateStr = "未知日期";
        let displayDate = "未知日期";
        let year = "其他";
        let month = "其他";
        let day = null;
        let weekday = null;
        
        // 简单的日期探测逻辑 (查找路径里的 4位数字作为年份)
        const yearPart = pathParts.find(p => /^\d{4}$/.test(p));
        if (yearPart) {
            year = yearPart;
            // 尝试找月份 (年份后面那个通常是月份)
            const yearIndex = pathParts.indexOf(year);
            if (pathParts[yearIndex + 1] && /^\d{1,2}$/.test(pathParts[yearIndex + 1])) {
                month = pathParts[yearIndex + 1].padStart(2, '0');
                
                // 尝试找日期 (支持 "01" 或 "01-Monday" 格式)
                const dayPart = pathParts[yearIndex + 2];
                if (dayPart) {
                    // 提取数字部分和星期几 (支持 "07-Friday" 格式)
                    const dayMatch = dayPart.match(/^(\d{1,2})(?:-(.+))?$/);
                    if (dayMatch) {
                        day = dayMatch[1].padStart(2, '0');
                        weekday = dayMatch[2]; // 提取星期几（如果有）
                        dateStr = `${year}-${month}-${day}`;
                        
                        // 星期几的中英文映射
                        const weekdayMap = {
                            'Monday': '星期一',
                            'Tuesday': '星期二',
                            'Wednesday': '星期三',
                            'Thursday': '星期四',
                            'Friday': '星期五',
                            'Saturday': '星期六',
                            'Sunday': '星期日'
                        };
                        
                        // 格式化显示日期
                        const weekdayChinese = weekday && weekdayMap[weekday] ? weekdayMap[weekday] : '';
                        if (weekdayChinese) {
                            displayDate = `${year}年${parseInt(month)}月${parseInt(day)}日 ${weekdayChinese}`;
                        } else {
                            displayDate = `${year}年${parseInt(month)}月${parseInt(day)}日`;
                        }
                    } else {
                        // 如果 dayPart 存在但格式不匹配，至少显示年月
                        dateStr = `${year}-${month}`;
                        displayDate = `${year}年${parseInt(month)}月`;
                    }
                } else {
                    // 没有日期部分，只显示年月
                    dateStr = `${year}-${month}`;
                    displayDate = `${year}年${parseInt(month)}月`;
                }
            }
        }

        // 标题默认为文件名去掉 .md 或 .txt
        const title = fileName.replace(/\.(md|txt)$/, '');
        
        // 判断文件类型
        const fileType = fileName.endsWith('.md') ? 'markdown' : 'text';

        return {
            title: title,
            date: dateStr,          // 用于排序的日期格式: 2025-11-22
            displayDate: displayDate, // 用于显示的日期格式: 2025年11月22日 星期六
            year: year,
            month: month,
            day: day,
            weekday: weekday,
            path: file.path, // 这里是相对路径，GitHub Pages 可以直接访问
            url: `https://raw.githubusercontent.com/${CONFIG.repoOwner}/${CONFIG.repoName}/${CONFIG.branch}/${file.path}`, // 用于读取内容
            fileType: fileType // 新增：记录文件类型
        };
    });

    // 按日期倒序排序
    return posts.sort((a, b) => {
        if (a.date === b.date) return 0;
        return a.date < b.date ? 1 : -1;
    });
}

// ==========================================
// 下面是 UI 渲染逻辑 (基本保持不变)
// ==========================================

function renderCalendar(posts) {
    const tree = {};
    posts.forEach(post => {
        if (!tree[post.year]) tree[post.year] = new Set();
        tree[post.year].add(post.month);
    });

    const container = document.getElementById('calendar-tree');
    container.innerHTML = '';

    const years = Object.keys(tree).sort((a, b) => b - a); // 年份倒序

    // "全部" 按钮
    const allDiv = document.createElement('div');
    allDiv.className = 'year-group';
    allDiv.innerHTML = `<div class="year-title" onclick="resetView()">查看全部 (${posts.length})</div>`;
    container.appendChild(allDiv);

    years.forEach(year => {
        if (year === '其他') return; // 把无法识别日期的放最后

        const yearGroup = document.createElement('div');
        yearGroup.className = 'year-group';
        
        // 月份倒序
        const months = Array.from(tree[year]).sort((a, b) => b - a);
        
        let monthHtml = '';
        months.forEach(month => {
            monthHtml += `<div class="month-item" onclick="filterByMonth('${year}', '${month}', this)">
                            ${parseInt(month)}月
                          </div>`;
        });

        yearGroup.innerHTML = `
            <div class="year-title" onclick="toggleYear(this)">
                ${year}年 <span><i class="fas fa-chevron-down"></i></span>
            </div>
            <div class="month-list">
                ${monthHtml}
            </div>
        `;
        container.appendChild(yearGroup);
    });
}

function toggleYear(element) {
    const list = element.nextElementSibling;
    const icon = element.querySelector('i');
    list.classList.toggle('active');
    
    if (list.classList.contains('active')) {
        icon.classList.remove('fa-chevron-down');
        icon.classList.add('fa-chevron-up');
    } else {
        icon.classList.remove('fa-chevron-up');
        icon.classList.add('fa-chevron-down');
    }
}

function resetView() {
    currentPosts = [...allPosts];
    document.getElementById('current-view-title').innerText = '最新动态';
    document.querySelectorAll('.month-item').forEach(el => el.classList.remove('active'));
    renderTimeline(true);
}

function filterByMonth(year, month, element) {
    document.querySelectorAll('.month-item').forEach(el => el.classList.remove('active'));
    element.classList.add('active');
    
    currentPosts = allPosts.filter(p => p.year === year && p.month === month);
    document.getElementById('current-view-title').innerText = `${year}年 ${parseInt(month)}月`;
    renderTimeline(true);
}

function renderTimeline(reset = false) {
    const feed = document.getElementById('timeline-feed');
    const loadMoreBtn = document.getElementById('load-more-btn');
    
    if (reset) {
        feed.innerHTML = '';
        currentPage = 1;
    }

    const start = (currentPage - 1) * postsPerPage;
    const end = start + postsPerPage;
    const postsToShow = currentPosts.slice(start, end);

    if (postsToShow.length === 0 && reset) {
        feed.innerHTML = '<p style="text-align:center; color:#888;">暂无日记。</p>';
        loadMoreBtn.style.display = 'none';
        return;
    }

    postsToShow.forEach(post => {
        const card = document.createElement('div');
        card.className = 'post-card';
        card.onclick = () => openPost(post);
        
        card.innerHTML = `
            <div class="post-meta">
                <i class="far fa-clock"></i> ${post.displayDate}
            </div>
            <h3 class="post-title">${post.title}</h3>
            <div class="post-preview">点击阅读全文...</div>
        `;
        feed.appendChild(card);
    });

    loadMoreBtn.style.display = (end >= currentPosts.length) ? 'none' : 'inline-block';
}

function loadMorePosts() {
    currentPage++;
    renderTimeline(false);
}

async function openPost(post) {
    const modal = document.getElementById('post-modal');
    const body = document.getElementById('modal-body');
    
    body.innerHTML = '<p>加载中...</p>';
    modal.style.display = 'block';
    
    try {
        // 使用 Raw 内容 URL 获取内容
        const response = await fetch(post.url);
        if (!response.ok) throw new Error('Failed to load post content');
        let content = await response.text();
        
        // 根据文件类型渲染内容
        if (post.fileType === 'markdown') {
            // Markdown 文件：使用 marked 解析，并添加样式类
            body.innerHTML = `<div class="markdown-body">${marked.parse(content)}</div>`;
        } else {
            // TXT 文件：保留纯文本格式（保留换行、空格和缩进）
            body.innerHTML = `<div class="text-content"><pre>${escapeHtml(content)}</pre></div>`;
        }
    } catch (error) {
        console.error(error);
        body.innerHTML = '<p>加载内容失败。请检查文件路径或网络。</p>';
    }
}

// 工具函数：转义 HTML 特殊字符，防止 XSS 攻击
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function closeModal() {
    document.getElementById('post-modal').style.display = 'none';
}

function showError(msg) {
    document.getElementById('timeline-feed').innerHTML = `<div style="color:red; text-align:center; padding:20px; border:1px solid red;">${msg}</div>`;
    document.getElementById('load-more-btn').style.display = 'none';
}
