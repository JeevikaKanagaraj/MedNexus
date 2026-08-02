import re

with open('admin-dashboard.html', 'r', encoding='utf-8') as f:
    content = f.read()

before = re.split(r'\s*<!-- Overdue Panel -->', content)[0]
after = '<!-- ALL CHECKOUTS TAB -->' + content.split('<!-- ALL CHECKOUTS TAB -->')[-1]

panels = '''
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
                '''

with open('admin-dashboard.html', 'w', encoding='utf-8') as f:
    f.write(before + '\n' + panels + '\n' + after)

print("Fixed admin-dashboard.html")
