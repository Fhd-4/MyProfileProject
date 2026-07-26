import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy, Inject, PLATFORM_ID, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  baseX: number;
  baseY: number;
}

interface ApiUser {
  id?: string;
  clientName?: string;
  userName?: string;
  email: string;
  status?: string;
  expires?: string;
  avatar?: string;
  role?: string;
  duration?: number;
  unit?: string;
}

@Component({
  selector: 'app-admin-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-panel.html',
  styleUrl: './admin-panel.scss'
})
export class AdminPanel implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('particleCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  private ctx!: CanvasRenderingContext2D;
  private particles: Particle[] = [];
  private animationFrameId!: number;
  mouse = { x: -1000, y: -1000, radius: 180 };
  private isBrowser: boolean;

  // APIs
  private readonly createClientUrl = `${environment.apiUrl}/Auth/create-client`;
  private readonly getAllUsersUrl = `${environment.apiUrl}/Auth/all-users`;

  // UI state
  isFormOpen: boolean = false; 
  newClient = { name: '', email: '', password: '', duration: 1, unit: 'Hours', role: 'Client' };

  // Clients Directory
  clients: ApiUser[] = [];

  // Preview digital card variables
  showPreviewModal: boolean = false;
  previewUser: any = null;
  showCardBackSide: boolean = false;

  // Edit overlay variables
  showEditModal: boolean = false;
  editForm = { id: '', name: '', email: '', password: '', duration: 1, unit: 'Hours', role: 'Client' };

  currentLang: 'en' | 'ar' = 'en';

  translations = {
    en: {
      brand: 'Super Admin Dashboard',
      totalClients: 'Total Accounts',
      active: 'Active Status',
      expired: 'Expired Status',
      addClient: 'Create User / Super Admin',
      createClient: 'Account Registration Details',
      clientName: 'Full Name / Username',
      email: 'Email Address',
      password: 'Secure Password',
      duration: 'Subscription Duration',
      unit: 'Time Unit',
      hours: 'Hours',
      days: 'Days',
      months: 'Months',
      years: 'Years',
      create: 'Add Account',
      cancel: 'Close',
      role: 'User Privilege Role',
      client: 'Client Portal User',
      superAdmin: 'System Super Admin',
      copied: 'Email copied to clipboard!',
      deleteConfirm: 'Are you sure you want to delete this user permanently?',
      viewTitle: 'Digital Card Live View',
      editTitle: 'Modify Account Properties',
      saveChanges: 'Save Configuration',
      logout: 'Logout',
      expires: 'Expires',
      aboutMe: 'About Me',
      skills: 'Skills',
      experience: 'Experience',
      education: 'Education',
      scanText: 'SCAN TO VIEW MY DIGITAL CARD',
      saveContact: 'Save Contact'
    },
    ar: {
      brand: 'لوحة تحكم السوبر أدمن',
      totalClients: 'إجمالي الحسابات',
      active: 'الحسابات النشطة',
      expired: 'الحسابات المنتهية',
      addClient: 'إضافة مستخدم / سوبر أدمن',
      createClient: 'بيانات تسجيل الحساب الجديد',
      clientName: 'الاسم الكامل / اسم المستخدم',
      email: 'البريد الإلكتروني',
      password: 'كلمة المرور',
      duration: 'مدة الاشتراك',
      unit: 'وحدة الزمن',
      hours: 'ساعات',
      days: 'أيام',
      months: 'شهور',
      years: 'سنوات',
      create: 'إنشاء الحساب',
      cancel: 'إغلاق',
      role: 'صلاحيات الحساب',
      client: 'مستخدم عادي (Client)',
      superAdmin: 'سوبر أدمن (Super Admin)',
      copied: 'تم نسخ البريد الإلكتروني للحافظة!',
      deleteConfirm: 'هل أنت متأكد من رغبتك في حذف هذا الحساب نهائياً؟',
      viewTitle: 'معاينة كرت العميل الرقمي',
      editTitle: 'تعديل خصائص وتفاصيل الحساب',
      saveChanges: 'حفظ التعديلات',
      logout: 'تسجيل خروج',
      expires: 'ينتهي في',
      aboutMe: 'نبذة عني',
      skills: 'المهارات',
      experience: 'الخبرة المهنية',
      education: 'التعليم',
      scanText: 'امسح الكود لعرض كرتي الرقمي',
      saveContact: 'حفظ جهة الاتصال'
    }
  };

  constructor(
    private http: HttpClient,
    private router: Router,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  get t() {
    return this.translations[this.currentLang];
  }

  get dir() {
    return this.currentLang === 'ar' ? 'rtl' : 'ltr';
  }

  ngOnInit(): void {
    if (this.isBrowser) {
      this.loadAllUsers();
    }
  }

  ngAfterViewInit(): void {
    if (this.isBrowser) {
      setTimeout(() => this.initCanvas(), 60);
    }
  }

  toggleLanguage() {
    this.currentLang = this.currentLang === 'en' ? 'ar' : 'en';
    if (this.isBrowser) {
      document.documentElement.setAttribute('dir', this.currentLang === 'ar' ? 'rtl' : 'ltr');
      document.documentElement.setAttribute('lang', this.currentLang);
      this.loadAllUsers(); // Reload to refresh formatting
    }
  }

  loadAllUsers(): void {
    let headers = new HttpHeaders();
    const token = localStorage.getItem("token");
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    this.http.get<any[]>(this.getAllUsersUrl, { headers }).subscribe({
      next: (users) => {
        this.clients = users.map((user, idx) => {
          let status = 'Active';
          if (user.subscriptionEndDate) {
            const endDate = new Date(user.subscriptionEndDate);
            if (endDate < new Date()) {
              status = 'Expired';
            }
          }

          let formattedExpiry = this.currentLang === 'ar' ? 'وصول مفتوح' : 'Unlimited Access';
          if (user.subscriptionEndDate) {
            const date = new Date(user.subscriptionEndDate);
            formattedExpiry = date.toLocaleString(this.currentLang === 'ar' ? 'ar-EG' : 'en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              hour12: true
            });
          }

          return {
            id: user.id,
            clientName: user.clientName || user.userName || 'Unknown User',
            email: user.email || '',
            status: user.role === 'SuperAdmin' ? 'Active' : status,
            expires: user.role === 'SuperAdmin' ? (this.currentLang === 'ar' ? 'وصول كامل' : 'Full Access') : formattedExpiry,
            avatar: user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.clientName || user.userName || 'User')}&background=1e293b&color=94a3b8&bold=true`,
            role: user.role || 'Client',
            duration: user.duration || 1,
            unit: user.unit || 'Hours'
          };
        });
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load users from API', err);
      }
    });
  }

  get totalClients(): number {
    return this.clients.length;
  }

  get activeClients(): number {
    return this.clients.filter(c => c.status === 'Active').length;
  }

  get expiredClients(): number {
    return this.clients.filter(c => c.status === 'Expired').length;
  }

  toggleForm(event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    this.isFormOpen = !this.isFormOpen;
  }

  onSubmitClient(event: Event): void {
    event.preventDefault();

    if (!this.newClient.name || !this.newClient.email || !this.newClient.password) {
      alert(this.currentLang === 'ar' ? "يرجى تعبئة كافة الحقول المطلوبة!" : "Please fill all fields.");
      return;
    }

    const isSuperAdmin = this.newClient.role === 'SuperAdmin';
    const url = isSuperAdmin ? `${environment.apiUrl}/Auth/create-superadmin` : this.createClientUrl;

    const body = isSuperAdmin ? {
      username: this.newClient.name,
      email: this.newClient.email,
      password: this.newClient.password
    } : {
      clientName: this.newClient.name,
      email: this.newClient.email,
      password: this.newClient.password,
      duration: this.newClient.duration,
      unit: this.newClient.unit
    };

    let headers = new HttpHeaders();
    const token = localStorage.getItem("token");
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    this.http.post<any>(url, body, { headers }).subscribe({
      next: (res) => {
        alert(this.currentLang === 'ar' ? "تم إنشاء الحساب بنجاح!" : (res.message || "User created successfully."));
        this.loadAllUsers();
        this.newClient = { name: '', email: '', password: '', duration: 1, unit: 'Hours', role: 'Client' };
        this.isFormOpen = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error(err);
        let errorMsg = this.currentLang === 'ar' ? "فشل إنشاء الحساب!" : "Failed to create user.";
        if (err.error) {
          if (Array.isArray(err.error)) {
            errorMsg = err.error.map((e: any) => e.description).join('\n');
          } else if (err.error.message) {
            errorMsg = err.error.message;
          } else if (typeof err.error === 'string') {
            errorMsg = err.error;
          }
        }
        alert(errorMsg);
      }
    });
  }

  copyEmail(email: string, event: Event): void {
    event.preventDefault();
    event.stopPropagation();

    if (this.isBrowser) {
      const cb = (text: string) => {
        if (navigator.clipboard) {
          navigator.clipboard.writeText(text).then(() => {
            alert(this.t.copied);
          });
        } else {
          const textarea = document.createElement('textarea');
          textarea.value = text;
          textarea.style.position = 'fixed';
          document.body.appendChild(textarea);
          textarea.select();
          try {
            document.execCommand('copy');
            alert(this.t.copied);
          } catch (err) {
            console.error('Fallback copy failed', err);
          }
          document.body.removeChild(textarea);
        }
      };
      cb(email);
    }
  }

  viewClient(client: ApiUser): void {
    const id = client.id;
    if (id) {
      window.open(`/user-card/${id}`, '_blank');
    }
  }

  toggleCardSide(): void {
    this.showCardBackSide = !this.showCardBackSide;
    this.cdr.detectChanges();
  }

  getQrCodeUrl(user: any): string {
    if (!user) return '';
    const id = user.Id || user.id;
    if (!id) return '';
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://fahd1.runasp.net';
    const cardUrl = `${origin}/user-card/${id}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=150x150&color=090d16&bgcolor=ffffff&data=${encodeURIComponent(cardUrl)}`;
  }

  downloadVCard(user: any, event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    if (!user) return;
    const vcardData = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `FN:${user.nameEn || user.username || ''}`,
      `ORG:${user.companyEn || ''}`,
      `TITLE:${user.titleEn || ''}`,
      `TEL;TYPE=CELL:${user.phone || ''}`,
      `EMAIL;TYPE=PREF,INTERNET:${user.email || ''}`,
      `URL:${user.website || ''}`,
      `ADR;TYPE=WORK:;;${user.locationEn || ''};;;;`,
      'END:VCARD'
    ].join('\n');

    const blob = new Blob([vcardData], { type: 'text/vcard;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${user.nameEn || 'contact'}.vcf`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  shareCard(user: any, event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    if (!user) return;
    const id = user.Id || user.id;
    if (!id) return;
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://fahd1.runasp.net';
    const shareUrl = `${origin}/user-card/${id}`;

    if (navigator.share) {
      navigator.share({
        title: user.nameEn || 'Digital Card',
        text: `View digital card of ${user.nameEn || ''}`,
        url: shareUrl
      }).catch(err => console.log('Share error', err));
    } else {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(shareUrl).then(() => {
          alert(this.currentLang === 'ar' ? 'تم نسخ رابط المشاركة للحافظة!' : 'Share link copied to clipboard!');
        });
      }
    }
  }

  editClient(client: any): void {
    this.editForm = {
      id: client.id || '',
      name: client.clientName || '',
      email: client.email || '',
      password: '',
      duration: client.duration || 1,
      unit: client.unit || 'Hours',
      role: client.role || 'Client'
    };
    this.showEditModal = true;
    this.cdr.detectChanges();
  }

  onSubmitEdit(event: Event): void {
    event.preventDefault();
    if (!this.editForm.name || !this.editForm.email) {
      alert(this.currentLang === 'ar' ? 'يرجى إدخال اسم العميل والبريد الإلكتروني!' : 'Please enter name and email.');
      return;
    }

    const editUrl = `${environment.apiUrl}/Auth/edit-user/${this.editForm.id}`;
    const body = {
      clientName: this.editForm.name,
      email: this.editForm.email,
      password: this.editForm.password || null,
      duration: this.editForm.duration,
      unit: this.editForm.unit
    };

    let headers = new HttpHeaders();
    const token = localStorage.getItem("token");
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    this.http.put<any>(editUrl, body, { headers }).subscribe({
      next: () => {
        alert(this.currentLang === 'ar' ? 'تم تحديث بيانات الحساب بنجاح!' : 'Account details updated successfully!');
        this.showEditModal = false;
        this.loadAllUsers();
      },
      error: (err) => {
        console.error(err);
        alert(this.currentLang === 'ar' ? 'فشل التعديل! تأكد من صحة البيانات وقوة كلمة المرور.' : 'Edit failed! Please check input values and password strength.');
      }
    });
  }

  deleteClient(client: any, event: Event): void {
    event.preventDefault();
    event.stopPropagation();

    const confirmMsg = this.currentLang === 'ar' 
      ? `هل أنت متأكد من حذف الحساب (${client.clientName || ''}) نهائياً؟` 
      : `Are you sure you want to delete user ${client.clientName || ''} permanently?`;

    if (confirm(confirmMsg)) {
       const deleteUrl = `${environment.apiUrl}/Auth/delete-user/${client.id}`;
       let headers = new HttpHeaders();
       const token = localStorage.getItem("token");
       if (token) {
         headers = headers.set('Authorization', `Bearer ${token}`);
       }

       this.http.delete<any>(deleteUrl, { headers }).subscribe({
         next: () => {
           alert(this.currentLang === 'ar' ? 'تم حذف الحساب بنجاح!' : 'User deleted successfully!');
           this.loadAllUsers();
         },
         error: (err) => {
           console.error(err);
           alert(this.currentLang === 'ar' ? 'فشل حذف الحساب!' : 'Failed to delete user.');
         }
       });
    }
  }
  
  logout(): void {
    if (this.isBrowser) {
      localStorage.removeItem('token');
      localStorage.removeItem('userId');
      localStorage.removeItem('user');
    }
    this.router.navigate(['/login']);
  }

  // Animation canvas methods
  initCanvas(): void {
    if (!this.canvasRef) return;
    const canvas = this.canvasRef.nativeElement;
    this.ctx = canvas.getContext('2d')!;
    this.resizeCanvas();

    window.addEventListener('mousemove', this.onGlobalMouseMove.bind(this));
    window.addEventListener('mouseleave', this.onGlobalMouseLeave.bind(this));
    window.addEventListener('resize', this.resizeCanvas.bind(this));

    const count = Math.min(95, Math.floor((canvas.width * canvas.height) / 12000));
    this.particles = [];
    for (let i = 0; i < count; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      this.particles.push({
        x,
        y,
        baseX: x,
        baseY: y,
        vx: (Math.random() - 0.5) * 0.8,
        vy: (Math.random() - 0.5) * 0.8,
        radius: Math.random() * 2.2 + 1.2
      });
    }

    this.animate();
  }

  resizeCanvas = () => {
    if (!this.canvasRef || !this.isBrowser) return;
    const canvas = this.canvasRef.nativeElement;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  };

  animate = () => {
    if (!this.ctx || !this.canvasRef || !this.isBrowser) return;
    const canvas = this.canvasRef.nativeElement;
    const width = canvas.width;
    const height = canvas.height;

    this.ctx.clearRect(0, 0, width, height);

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];

      const dx = this.mouse.x - p.x;
      const dy = this.mouse.y - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < this.mouse.radius && dist > 0) {
        const force = (this.mouse.radius - dist) / this.mouse.radius;
        const pushX = (dx / dist) * force * 4.5;
        const pushY = (dy / dist) * force * 4.5;
        p.x -= pushX;
        p.y -= pushY;
      }

      p.x += p.vx;
      p.y += p.vy;

      if (p.x < 0) { p.x = 0; p.vx *= -1; }
      if (p.x > width) { p.x = width; p.vx *= -1; }
      if (p.y < 0) { p.y = 0; p.vy *= -1; }
      if (p.y > height) { p.y = height; p.vy *= -1; }

      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = 'rgba(96, 165, 250, 0.85)';
      this.ctx.fill();

      if (dist < 170) {
        const mouseOpacity = (1 - dist / 170) * 0.45;
        this.ctx.beginPath();
        this.ctx.moveTo(p.x, p.y);
        this.ctx.lineTo(this.mouse.x, this.mouse.y);
        this.ctx.strokeStyle = `rgba(59, 130, 246, ${mouseOpacity})`;
        this.ctx.lineWidth = 1.2;
        this.ctx.stroke();
      }

      for (let j = i + 1; j < this.particles.length; j++) {
        const p2 = this.particles[j];
        const distance = Math.hypot(p.x - p2.x, p.y - p2.y);

        if (distance < 145) {
          const lineOpacity = (1 - distance / 145) * 0.28;
          this.ctx.beginPath();
          this.ctx.moveTo(p.x, p.y);
          this.ctx.lineTo(p2.x, p2.y);
          this.ctx.strokeStyle = `rgba(59, 130, 246, ${lineOpacity})`;
          this.ctx.lineWidth = 0.9;
          this.ctx.stroke();
        }
      }
    }

    this.animationFrameId = requestAnimationFrame(this.animate.bind(this));
  };

  onGlobalMouseMove(event: MouseEvent): void {
    this.mouse.x = event.clientX;
    this.mouse.y = event.clientY;
  }

  onGlobalMouseLeave(): void {
    this.mouse.x = -1000;
    this.mouse.y = -1000;
  }

  ngOnDestroy(): void {
    if (this.isBrowser) {
      if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
      window.removeEventListener('resize', this.resizeCanvas.bind(this));
      window.removeEventListener('mousemove', this.onGlobalMouseMove.bind(this));
      window.removeEventListener('mouseleave', this.onGlobalMouseLeave.bind(this));
    }
  }
}
