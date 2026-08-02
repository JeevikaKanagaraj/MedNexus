const fs = require('fs');
const content = fs.readFileSync('admin-dashboard.html', 'utf-8');

const before = content.split('<!-- Overdue Panel -->')[0];
let after = '<!-- ALL CHECKOUTS TAB -->' + content.split('<!-- ALL CHECKOUTS TAB -->')[1];
// The split on <!-- ALL CHECKOUTS TAB --> above might be slightly off if there are multiple.
// To be safe, let's find the last occurrence:
const parts = content.split('<!-- ALL CHECKOUTS TAB -->');
after = '<!-- ALL CHECKOUTS TAB -->' + parts[parts.length - 1];

const panels = `
                <!-- Overdue Panel -->
                <div class="card" id="overdue-panel" style="margin-top: 24px;">
                    <div class="card-header">
                        <span class="card-title">Critical Overdue Checkouts</span>
                        <span class="card-subtitle" style="color:var(--status-overdue);font-size:.75rem;">Items past due date - send alerts below</span>
                    </div>
                    <div class="card-body" id="overdue-panel-body">
                        <div class="empty-state">Loading...</div>
                    </div>
                </div>
                
                <!-- Failsafe Panel -->
                <div class="card" id="failsafe-panel" style="margin-top: 24px;">
                    <div class="card-header"><span class="card-title">Booking Failsafe Alerts</span></div>
                    <div class="card-body" id="failsafe-panel-body">
                        <div class="empty-state">Loading...</div>
                    </div>
                </div>
                </div> <!-- END TAB DASHBOARD -->
                `;

// Also clean up any lingering failsafe/overdue panels at the very bottom of `after`
after = after.replace(/<!-- Overdue Panel -->[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/g, '');
after = after.replace(/<!-- Failsafe Panel -->[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/g, '');
after = after.replace(/<!-- Overdue Panel -->[\s\S]*?<\/div>\s*<\/div>\s*<!-- Failsafe Panel -->[\s\S]*?<\/div>\s*<\/div>/g, '');

fs.writeFileSync('admin-dashboard.html', before + panels + '\n' + after, 'utf-8');
console.log('Fixed HTML successfully.');
