import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy, Inject, PLATFORM_ID, OnInit } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
}

interface ApiUser {
  clientName?: string;
  userName?: string;
  email: string;
  status?: string;
  expires?: string;
  avatar?: string;
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
  mouse = { x: -1000, y: -1000 };
  private isBrowser: boolean;

  // روابط الـ API الحقيقية من الـ Swagger الخاص بك
  private readonly createClientUrl = 'https://localhost:44367/api/Auth/create-client';
  private readonly getAllUsersUrl = 'https://localhost:44367/api/Auth/all-users';

  // متغيرات الواجهة وحقول الإدخال
  isFormOpen: boolean = false; 
  newClient = { name: '', email: '', password: '', duration: 1, unit: 'Hours' };

  // مصفوفة المستخدمين الحقيقية القادمة من السيرفر
  clients: ApiUser[] = [];

  // عدادات الإحصائيات الديناميكية
  totalClientsCount = 0;
  activeClientsCount = 0;
  expiredClientsCount = 0;

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    if (this.isBrowser) {
      this.loadAllUsers();
    }
  }

  ngAfterViewInit(): void {
    if (this.isBrowser) {
      this.initCanvas();
    }
  }

  // جلب كافة المستخدمين من السيرفر وحساب العدادات ديناميكياً
  loadAllUsers(): void {
    let headers = new HttpHeaders();
    const token = localStorage.getItem("token");
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    this.http.get<ApiUser[]>(this.getAllUsersUrl, { headers }).subscribe({
      next: (users) => {
        // تحويل البيانات وتأمين الأسماء المتوقعة من السيرفر
        this.clients = users.map(user => ({
          ...user,
          clientName: user.clientName || user.userName || 'Unknown User',
          status: user.status || 'Active', // الافتراضي نشط إذا لم يرسله السيرفر
          expires: user.expires || 'Unlimited Access',
          avatar: user.avatar || 'https://unsplash.com'
        }));

        this.calculateStats();
      },
      error: (err) => {
        console.error('Failed to load users from API', err);
      }
    });
  }

  calculateStats(): void {
    this.totalClientsCount = this.clients.length;
    this.activeClientsCount = this.clients.filter(c => c.status === 'Active').length;
    this.expiredClientsCount = this.clients.filter(c => c.status === 'Expired').length;
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
      alert("Please fill all fields.");
      return;
    }

    const body = {
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

    this.http.post<any>(this.createClientUrl, body, { headers }).subscribe({
      next: (res) => {
        alert(res.message || "Client created successfully.");
        
        // إعادة تحديث القائمة فوراً من السيرفر لضمان جلب البيانات الحقيقية الحالية
        this.loadAllUsers();

        // تصفير الخيارات
        this.newClient = { name: '', email: '', password: '', duration: 1, unit: 'Hours' };
        this.isFormOpen = false;
      },
      error: (err) => {
        console.error(err);
        alert(err.error?.message || "Failed to create client.");
      }
    });
  }

  deleteClient(index: number, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.clients.splice(index, 1);
    this.calculateStats(); // تحديث العدادات بعد الحذف الفوري
  }

  // محرك الخلفية التفاعلية العصبي
  initCanvas(): void {
    const canvas = this.canvasRef.nativeElement;
    this.ctx = canvas.getContext('2d')!;
    this.resizeCanvas();

    window.addEventListener('resize', this.resizeCanvas.bind(this));
    window.addEventListener('mousemove', this.onGlobalMouseMove.bind(this));
    window.addEventListener('mouseleave', this.onGlobalMouseLeave.bind(this));

    this.createParticles();
    this.animate();
  }

  resizeCanvas(): void {
    if (!this.canvasRef || !this.isBrowser) return;
    const canvas = this.canvasRef.nativeElement;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  createParticles(): void {
    if (!this.isBrowser) return;
    const particleCount = Math.floor((window.innerWidth * window.innerHeight) / 9000);
    this.particles = [];
    for (let i = 0; i < particleCount; i++) {
      this.particles.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        vx: (Math.random() - 0.5) * 1.5,
        vy: (Math.random() - 0.5) * 1.5,
        radius: Math.random() * 2.5 + 1,
        color: 'rgba(255, 255, 255, 0.4)'
      });
    }
  }

  animate(): void {
    if (!this.isBrowser) return;

    this.ctx.clearRect(0, 0, this.canvasRef.nativeElement.width, this.canvasRef.nativeElement.height);

    this.particles.forEach((p, index) => {
      p.x += p.vx;
      p.y += p.vy;

      if (p.x < 0 || p.x > window.innerWidth) p.vx *= -1;
      if (p.y < 0 || p.y > window.innerHeight) p.vy *= -1;

      const dx = this.mouse.x - p.x;
      const dy = this.mouse.y - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist < 150) {
        this.ctx.beginPath();
        this.ctx.strokeStyle = `rgba(59, 130, 246, ${0.45 * (1 - dist / 150)})`;
        this.ctx.lineWidth = 0.8;
        this.ctx.moveTo(p.x, p.y);
        this.ctx.lineTo(this.mouse.x, this.mouse.y);
        this.ctx.stroke();
        this.ctx.closePath();
      }

      for (let j = index + 1; j < this.particles.length; j++) {
        const p2 = this.particles[j];
        const pDx = p2.x - p.x;
        const pDy = p2.y - p.y;
        const pDist = Math.sqrt(pDx * pDx + pDy * pDy);

        if (pDist < 100) {
          this.ctx.beginPath();
          this.ctx.strokeStyle = `rgba(255, 255, 255, ${0.12 * (1 - pDist / 100)})`;
          this.ctx.lineWidth = 0.4;
          this.ctx.moveTo(p.x, p.y);
          this.ctx.lineTo(p2.x, p2.y);
          this.ctx.stroke();
          this.ctx.closePath();
        }
      }

      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = p.color;
      this.ctx.fill();
      this.ctx.closePath();
    });

    this.animationFrameId = requestAnimationFrame(this.animate.bind(this));
  }

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
