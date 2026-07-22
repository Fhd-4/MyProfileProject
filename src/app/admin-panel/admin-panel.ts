import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy, Inject, PLATFORM_ID, OnInit } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../environments/environment';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
}

interface ApiUser {
  id?: string;
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

  // روابط الـ API الحقيقية من Swagger
  private readonly createClientUrl = `${environment.apiUrl}/Auth/create-client`;
  private readonly getAllUsersUrl = `${environment.apiUrl}/Auth/all-users`;

  // التحكم بالواجهة وحقول الإدخال
  isFormOpen: boolean = false; 
  newClient = { name: '', email: '', password: '', duration: 1, unit: 'Hours' };

  // مصفوفة المستخدمين الحقيقية
  clients: ApiUser[] = [];

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

  // 3. قراءة البيانات الحقيقية من السيرفر وإعادة استدعائها بعد كل عملية ناجحة
  loadAllUsers(): void {
    let headers = new HttpHeaders();
    const token = localStorage.getItem("token");
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    this.http.get<ApiUser[]>(this.getAllUsersUrl, { headers }).subscribe({
      next: (users) => {
        this.clients = users.map((user, idx) => ({
          ...user,
          clientName: user.clientName || user.userName || 'Unknown User',
          status: user.status || (idx % 2 === 0 ? 'Active' : 'Expired'), // حل مؤقت للـ Status لحين تصوير الـ Response
          expires: user.expires || 'Unlimited Access',
          // 1. إصلاح روابط صور المستخدمين لتظهر بشكل عشوائي مميز وتلغي كلمة Avatar
          avatar: `https://pravatar.cc{(idx % 70) + 1}`
        }));
      },
      error: (err) => {
        console.error('Failed to load users from API', err);
      }
    });
  }

  // 2. جعل الإحصائيات ديناميكية بالكامل عبر الـ Getters المحدثة ذكياً
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
        // استدعاء البيانات الحقيقية من الخادم فوراً بعد نجاح الإنشاء
        this.loadAllUsers();

        this.newClient = { name: '', email: '', password: '', duration: 1, unit: 'Hours' };
        this.isFormOpen = false;
      },
      error: (err) => {
        console.error(err);
        alert(err.error?.message || "Failed to create client.");
      }
    });
  }

  // 6. تفعيل خاصية نسخ البريد الإلكتروني للحافظة وإعلام المستخدم نقراً
  copyEmail(email: string, event: Event): void {
    event.stopPropagation();
    if (this.isBrowser && navigator.clipboard) {
      navigator.clipboard.writeText(email).then(() => {
        alert(`Copied to clipboard: ${email}`);
      }).catch(err => {
        console.error('Could not copy text: ', err);
      });
    }
  }

  // 4. ربط أزرار العرض والتعديل لوظائف جاهزة للبناء
  viewClient(client: ApiUser): void {
    alert(`Viewing client profile: ${client.clientName}`);
  }

  editClient(client: ApiUser): void {
    alert(`Editing client configurations: ${client.clientName}`);
  }

  // 7. الاحتفاظ بالحذف من الواجهة مؤقتاً لحين تزويدي بـ API الحذف من الـ Backend
  deleteClient(index: number, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.clients.splice(index, 1);
  }

  // محرك جزيئات الخلفية الحركية
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
