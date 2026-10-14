import { ImageResponse } from "next/og";

export const alt = "Vydys Academy — AI, Tech & Verified Skills";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage(){
  return new ImageResponse(
    <div
      style={{
        width:"100%",
        height:"100%",
        display:"flex",
        position:"relative",
        overflow:"hidden",
        background:"linear-gradient(135deg,#030711 0%,#071525 48%,#0b2b5f 100%)",
        color:"#fff",
        fontFamily:"Arial, sans-serif",
        padding:"54px 64px"
      }}
    >
      <div
        style={{
          position:"absolute",right:"-100px",top:"-130px",width:"520px",height:"520px",
          borderRadius:"999px",background:"radial-gradient(circle,rgba(45,123,255,.42) 0%,rgba(45,123,255,0) 68%)"
        }}
      />
      <div
        style={{
          position:"absolute",left:"210px",bottom:"-240px",width:"620px",height:"420px",
          borderRadius:"999px",background:"radial-gradient(circle,rgba(90,160,255,.22) 0%,rgba(90,160,255,0) 70%)"
        }}
      />

      <div style={{display:"flex",width:"100%",height:"100%",flexDirection:"column",justifyContent:"space-between",position:"relative"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{display:"flex",alignItems:"center",gap:"18px"}}>
            <div style={{
              width:"74px",height:"74px",display:"flex",alignItems:"center",justifyContent:"center",
              borderRadius:"22px",background:"linear-gradient(145deg,#0e4fe8,#5aa0ff)",
              boxShadow:"0 14px 38px rgba(45,123,255,.28)",fontSize:"48px",fontWeight:950,letterSpacing:"-5px"
            }}>V</div>
            <div style={{display:"flex",flexDirection:"column"}}>
              <div style={{display:"flex",fontSize:"44px",fontWeight:950,letterSpacing:"6px"}}>VYDYS</div>
              <div style={{display:"flex",fontSize:"12px",fontWeight:800,letterSpacing:"6px",color:"#69a7ff",marginTop:"2px"}}>ACADEMY</div>
            </div>
          </div>
          <div style={{
            display:"flex",alignItems:"center",gap:"10px",padding:"12px 18px",
            border:"1px solid rgba(118,171,255,.32)",borderRadius:"999px",
            background:"rgba(10,28,53,.72)",fontSize:"20px",fontWeight:700,color:"#b9d5ff"
          }}>
            AI • TECH • VERIFIED SKILLS
          </div>
        </div>

        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:"44px"}}>
          <div style={{display:"flex",flexDirection:"column",maxWidth:"740px"}}>
            <div style={{display:"flex",fontSize:"24px",fontWeight:800,letterSpacing:"2px",color:"#68a7ff",marginBottom:"14px"}}>
              VYDYS ACADEMY
            </div>
            <div style={{display:"flex",flexDirection:"column",fontSize:"62px",lineHeight:1.02,fontWeight:900,letterSpacing:"-2.5px"}}>
              <span>Apprenez l’IA & la Tech.</span>
              <span style={{color:"#71b0ff"}}>Construisez des compétences réelles.</span>
            </div>
            <div style={{display:"flex",fontSize:"25px",lineHeight:1.45,color:"#c6d4e8",marginTop:"22px",maxWidth:"690px"}}>
              Formations, Classroom, AI Lab, Auto Learner et parcours pratiques sur une seule plateforme.
            </div>
          </div>

          <div style={{
            width:"280px",height:"280px",borderRadius:"58px",
            background:"linear-gradient(145deg,#0d4fd6,#2d7bff 58%,#62a7ff)",
            display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
            boxShadow:"0 30px 90px rgba(45,123,255,.35)",border:"1px solid rgba(255,255,255,.18)"
          }}>
            <div style={{display:"flex",fontSize:"88px",fontWeight:900,letterSpacing:"-7px"}}>AI</div>
            <div style={{display:"flex",fontSize:"17px",fontWeight:800,letterSpacing:"3px",color:"#dbeaff",marginTop:"6px"}}>LEARN • BUILD • PROVE</div>
          </div>
        </div>

        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",borderTop:"1px solid rgba(141,183,241,.22)",paddingTop:"20px"}}>
          <div style={{display:"flex",gap:"12px"}}>
            {["FORMATIONS","CLASSROOM","AI LAB","AUTO LEARNER"].map((item)=>(
              <div key={item} style={{
                display:"flex",padding:"10px 15px",borderRadius:"12px",
                background:"rgba(255,255,255,.06)",border:"1px solid rgba(255,255,255,.08)",
                color:"#cbd9eb",fontSize:"16px",fontWeight:800
              }}>{item}</div>
            ))}
          </div>
          <div style={{display:"flex",fontSize:"22px",fontWeight:800,color:"#fff"}}>www.vydys.com</div>
        </div>
      </div>
    </div>,
    size
  );
}
